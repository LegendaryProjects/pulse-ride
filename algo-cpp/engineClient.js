const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const readline = require('node:readline');

class EngineClient extends EventEmitter {
  constructor(binaryPath, campusGraphJson, options = {}) {
    super();

    this.binaryPath = binaryPath;
    this.campusGraphJson = campusGraphJson;
    this.options = {
      initTimeoutMs: 5000,
      requestTimeoutMs: 3000,
      gracefulShutdownMs: 1500,
      ...options,
    };

    this.pendingRequests = new Map();
    this.nextRequestId = 1;
    this._closed = false;
    this._readyResolve = null;
    this._readyReject = null;
    this._child = null;
    this._readlineInterface = null;

    this.ready = this._initialize();
  }

  _createError(message) {
    return new Error(message);
  }

  _generateRequestId() {
    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return id;
  }

  _rejectAllPending(message) {
    for (const { reject, timeoutHandle } of this.pendingRequests.values()) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      reject(this._createError(message));
    }
    this.pendingRequests.clear();
  }

  _writeJson(obj) {
    if (!this._child || !this._child.stdin || this._child.stdin.destroyed) {
      throw this._createError('engine process is not available');
    }

    this._child.stdin.write(`${JSON.stringify(obj)}\n`);
  }

  _handleProcessError(error) {
    if (!this._readyReject) {
      return;
    }

    this._readyReject(error);
    this._readyReject = null;
    this._readyResolve = null;
  }

  _handleIncomingLine(line) {
    if (!line || !line.trim()) {
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      console.warn('[EngineClient] Ignoring non-JSON stdout line:', line);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return;
    }

    if (parsed.type === 'init_ack') {
      if (parsed.status === 'ok') {
        if (this._readyResolve) {
          this._readyResolve();
          this._readyResolve = null;
          this._readyReject = null;
        }
        return;
      }

      const message = parsed.message || 'engine init failed';
      if (this._readyReject) {
        this._readyReject(this._createError(message));
        this._readyResolve = null;
        this._readyReject = null;
      }
      return;
    }

    if (typeof parsed.requestId === 'undefined') {
      return;
    }

    const requestId = parsed.requestId;
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(requestId);
    if (pending.timeoutHandle) {
      clearTimeout(pending.timeoutHandle);
    }

    if (parsed.type === 'error') {
      pending.reject(this._createError(parsed.message || 'engine reported an error'));
      return;
    }

    pending.resolve(parsed);
  }

  _initialize() {
    return new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;

      const child = spawn(this.binaryPath, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this._child = child;

      child.on('error', (error) => {
        this._closed = true;
        this._rejectAllPending(`engine process failed to start: ${error.message}`);
        this.emit('crash', { error, code: null, signal: null });
        this._handleProcessError(error);
      });

      child.on('exit', (code, signal) => {
        this._closed = true;
        const message = `engine process exited unexpectedly (code ${code ?? 'null'}${signal ? `, signal ${signal}` : ''})`;
        this._rejectAllPending(message);
        this.emit('crash', { code, signal });

        if (this._readyReject) {
          this._readyReject(this._createError(message));
          this._readyReject = null;
          this._readyResolve = null;
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        if (text.trim()) {
          this.emit('stderr', text);
        }
      });

      this._readlineInterface = readline.createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
      });

      this._readlineInterface.on('line', (line) => {
        this._handleIncomingLine(line);
      });

      this._readlineInterface.on('error', (error) => {
        this.emit('stderr', `readline error: ${error.message}`);
      });

      const initMessage = {
        type: 'init',
        campusGraph: this.campusGraphJson,
      };

      this._writeJson(initMessage);

      const timer = setTimeout(() => {
        this._closed = true;
        const message = `engine init timed out after ${this.options.initTimeoutMs}ms`;
        this._rejectAllPending(message);
        if (this._readyReject) {
          this._readyReject(this._createError(message));
          this._readyReject = null;
          this._readyResolve = null;
        }
      }, this.options.initTimeoutMs);

      const originalResolve = this._readyResolve;
      this._readyResolve = () => {
        clearTimeout(timer);
        originalResolve();
      };
      this._readyReject = (error) => {
        clearTimeout(timer);
        reject(error);
      };
    });
  }

  _sendRequest(type, payload = {}, timeoutMs = this.options.requestTimeoutMs) {
    if (this._closed) {
      return Promise.reject(this._createError('engine process is closed'));
    }

    const requestId = this._generateRequestId();
    const message = { type, requestId, ...payload };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(this._createError(`request ${requestId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeoutHandle });
      try {
        this._writeJson(message);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutHandle);
        reject(error);
      }
    }).then((response) => {
      if (response && response.type === 'error') {
        throw this._createError(response.message || 'engine reported an error');
      }
      return response;
    });
  }

  async addVehicle(vehicle) {
    await this.ready;
    const response = await this._sendRequest('add_vehicle', { vehicle });
    return response && response.type === 'ack' ? true : response;
  }

  async removeVehicle(vehicleId) {
    await this.ready;
    const response = await this._sendRequest('remove_vehicle', { vehicleId });
    return response && response.type === 'ack' ? true : response;
  }

  async setVehicleState(vehicleId, state) {
    await this.ready;
    const response = await this._sendRequest('set_vehicle_state', { vehicleId, state });
    return response && response.type === 'ack' ? true : response;
  }

  async assignRequest(rideRequest) {
    await this.ready;
    const response = await this._sendRequest('assign_request', { request: rideRequest });
    return response && response.result ? response.result : response;
  }

  async getFleetState() {
    await this.ready;
    const response = await this._sendRequest('get_fleet_state');
    return response && Array.isArray(response.vehicles) ? response.vehicles : [];
  }

  async shutdown() {
    if (!this._child || this._child.killed) {
      return;
    }

    this._closed = true;
    this._writeJson({ type: 'shutdown' });

    const waitForExit = new Promise((resolve) => {
      if (this._child.exitCode !== null) {
        resolve();
        return;
      }

      const onExit = () => resolve();
      this._child.once('exit', onExit);
      setTimeout(() => {
        this._child.removeListener('exit', onExit);
        if (this._child.exitCode === null) {
          this._child.kill('SIGTERM');
        }
        resolve();
      }, this.options.gracefulShutdownMs);
    });

    await waitForExit;
    this._rejectAllPending('engine process was shut down');
    if (this._readlineInterface) {
      this._readlineInterface.close();
    }
    if (this._child && !this._child.killed && this._child.exitCode === null) {
      this._child.kill('SIGKILL');
    }
  }
}

module.exports = { EngineClient };
