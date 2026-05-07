import { useState, useCallback, useRef } from 'react';

let _showToast: ((msg: string) => void) | null = null;

export function useToast() {
  return useCallback((msg: string) => {
    _showToast?.(msg);
  }, []);
}

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  _showToast = useCallback(function showToastImpl(message: string) {
    setMsg(message);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2500);
  }, []);

  return (
    <div className={`toast${visible ? ' show' : ''}`}>{msg}</div>
  );
}
