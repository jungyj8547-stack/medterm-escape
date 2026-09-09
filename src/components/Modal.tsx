import type { ReactNode } from 'react';

interface Props {
  title: string;
  icon?: string;
  onClose?: () => void;
  children: ReactNode;
  right?: ReactNode;
}

export default function Modal({ title, icon, onClose, children, right }: Props) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
          <h3>{title}</h3>
          {right}
          {onClose && (
            <button className="close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
