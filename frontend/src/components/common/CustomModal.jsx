import React from 'react';

const CustomModal = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = "Notice",
  message = "",
  type = "info", // 'info' | 'success' | 'warning' | 'confirm' | 'trip_complete'
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = false
}) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success' || type === 'trip_complete';
  const isWarning = type === 'warning';
  const isConfirm = type === 'confirm';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#181818] border border-[#282828] w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Icon & Title Header */}
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${
            isSuccess 
              ? 'bg-[#1ED760]/15 border border-[#1ED760]/40 text-[#1ED760]' 
              : isWarning || isConfirm 
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400' 
                : 'bg-blue-500/15 border border-blue-500/40 text-blue-400'
          }`}>
            {isSuccess ? '✓' : (isWarning || isConfirm ? '⚠️' : 'ℹ️')}
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white leading-tight">{title}</h3>
            <span className="text-[10px] font-bold text-[#B3B3B3] uppercase tracking-wider">
              Pulse Ride Notification
            </span>
          </div>
        </div>

        {/* Message Content */}
        <div className="text-sm text-[#CCCCCC] leading-relaxed py-1 bg-[#121212] border border-[#282828] p-4 rounded-xl">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-1">
          {(showCancel || isConfirm) && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#B3B3B3] bg-[#121212] border border-[#282828] hover:bg-[#222222] hover:text-white transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
              if (onClose) onClose();
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg ${
              isConfirm 
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20' 
                : isSuccess 
                  ? 'bg-[#1ED760] hover:bg-[#1db954] text-black shadow-[#1ED760]/20' 
                  : 'bg-[#1ED760] hover:bg-[#1db954] text-black shadow-[#1ED760]/20'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomModal;
