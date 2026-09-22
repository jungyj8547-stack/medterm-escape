import { useEffect, useState } from 'react';

/**
 * 브라우저 기본 confirm() 대신 쓰는 게임 안 확인창.
 * 사용: const ok = await askConfirm('정말 포기할까요?', { okLabel: '포기', danger: true });
 */
interface Options {
  okLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  title?: string;
}
interface Request extends Options {
  message: string;
  resolve: (ok: boolean) => void;
}

let listener: ((r: Request | null) => void) | null = null;

export function askConfirm(message: string, opts: Options = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      resolve(window.confirm(message));
      return;
    }
    listener({ message, resolve, ...opts });
  });
}

export default function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    listener = setReq;
    return () => {
      listener = null;
    };
  }, []);
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answer(false);
      if (e.key === 'Enter') answer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;
  const answer = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };
  return (
    <div className="modal-bg" style={{ zIndex: 60 }} onClick={() => answer(false)}>
      <div className="modal confirm" onClick={(e) => e.stopPropagation()} role="alertdialog">
        <div className="modal-body">
          {req.title && <h3 style={{ marginBottom: 8 }}>{req.title}</h3>}
          <p style={{ fontSize: 17, whiteSpace: 'pre-line' }}>{req.message}</p>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn" onClick={() => answer(false)} autoFocus>
              {req.cancelLabel ?? '취소'}
            </button>
            <button className={`btn ${req.danger ? 'danger' : 'primary'}`} onClick={() => answer(true)}>
              {req.okLabel ?? '확인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
