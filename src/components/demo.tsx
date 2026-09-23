'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  LoaderCircle,
  Monitor,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Wifi,
  X,
} from 'lucide-react';
import { activeStatuses, steps, type PairingSession } from '@/lib/types';

type Snapshot = { current: PairingSession | null; devices: PairingSession[] };
type ModalStep = 'method' | 'code' | 'confirm' | 'progress' | 'success' | 'error';
const pairUrl = 'http://localhost:2001/login?pair=1';

async function api(path: string, body?: unknown) {
  const response = await fetch('/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}
const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));
function Status({ online = false, children }: { online?: boolean; children: React.ReactNode }) {
  return (
    <span className={'status' + (online ? ' online' : '')}>
      <i />
      {children}
    </span>
  );
}
function Details({ session }: { session: PairingSession }) {
  return (
    <dl className="detail-grid">
      <div>
        <dt>Hardware</dt>
        <dd>{session.device.productName}</dd>
      </div>
      <div>
        <dt>Serial number</dt>
        <dd>{session.device.serialNumber}</dd>
      </div>
      <div>
        <dt>Operating system</dt>
        <dd>Clea OS {session.device.cleaOsVersion}</dd>
      </div>
      <div>
        <dt>Architecture</dt>
        <dd>ARM64</dd>
      </div>
    </dl>
  );
}

export default function Demo({ surface }: { surface: 'device' | 'platform' }) {
  const pathname = usePathname();
  const device = surface === 'device';
  const [snapshot, setSnapshot] = useState<Snapshot>({ current: null, devices: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [now, setNow] = useState(0);
  const [boot, setBoot] = useState(device);
  const [bootPhase, setBootPhase] = useState(0);
  const [appOpen, setAppOpen] = useState(false);
  const [pairPhase, setPairPhase] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<ModalStep | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('MX95 Evaluation Kit');
  const [loginBusy, setLoginBusy] = useState(false);

  const reload = useCallback(async () => {
    const state: Snapshot = await api('demo/state');
    setSnapshot(state);
    setNow(Date.now());
    setLoaded(true);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (!operation.current) await reload();
      } catch {
        if (!stopped) setError('Local connection unavailable. Check that the demo is running.');
      }
      if (!stopped) timeout = setTimeout(poll, 550);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timeout);
    };
  }, [reload]);

  useEffect(() => {
    if (!boot) return;
    setBootPhase(0);
    const a = setTimeout(() => setBootPhase(1), 650);
    const b = setTimeout(() => setBootPhase(2), 1550);
    const c = setTimeout(() => {
      setBootPhase(3);
      setBoot(false);
      setAppOpen(false);
    }, 2850);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [boot]);

  useEffect(() => {
    if (device || pathname === '/login') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pair') === '1') {
      setModal('code');
      window.history.replaceState({}, '', '/devices');
    }
    const routeId = pathname.match(/^\/devices\/pair\/([^/]+)$/)?.[1];
    if (routeId) {
      setSelectedId(routeId);
      setModal('confirm');
    }
  }, [device, pathname]);

  const session = device
    ? snapshot.current
    : snapshot.current?.id === selectedId
      ? snapshot.current
      : snapshot.devices.find((item) => item.id === selectedId) || null;
  const remaining = Math.max(
    0,
    Math.ceil(((snapshot.current ? Date.parse(snapshot.current.expiresAt) : now) - now) / 1000),
  );
  const countdown =
    String(Math.floor(remaining / 60)).padStart(2, '0') +
    ':' +
    String(remaining % 60).padStart(2, '0');

  useEffect(() => {
    if (!modal || !session) return;
    if (session.status === 'connected') setModal('success');
    else if (
      session.status === 'failed' ||
      session.status === 'cancelled' ||
      session.status === 'expired'
    )
      setModal('error');
    else if (activeStatuses.includes(session.status)) setModal('progress');
  }, [session?.status, modal, session]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, busy]);

  async function run(task: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      await task();
      await reload();
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function reset() {
    await run(async () => {
      await api('demo/reset', {});
      setSelectedId(null);
      setCode('');
      setName('MX95 Evaluation Kit');
      setModal(null);
      setAppOpen(false);
      setPairPhase(-1);
      if (device) setBoot(true);
    });
  }
  async function create() {
    if (operation.current) return;
    setPairPhase(0);
    await run(async () => {
      await wait(500);
      setPairPhase(1);
      await wait(580);
      setPairPhase(2);
      await wait(430);
      await api('pairing/sessions', {});
      await wait(200);
    });
    setPairPhase(-1);
  }
  async function resolve() {
    await run(async () => {
      await wait(570);
      const found: PairingSession = await api('pairing/resolve', { shortCode: code });
      setSelectedId(found.id);
      setModal('confirm');
    });
  }
  async function confirm() {
    if (!session) return;
    await run(async () => {
      await api('pairing/sessions/' + session.id + '/confirm', {
        organizationId: 'free-trial',
        displayName: name,
      });
      setModal('progress');
    });
  }
  async function action(command: 'retry' | 'cancel') {
    if (!session) return;
    await run(async () => {
      await api('pairing/sessions/' + session.id + '/' + command, {});
    });
  }
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    await wait(650);
    window.location.assign('/devices?pair=1');
  }

  if (device) {
    if (boot)
      return (
        <div className="device-dark boot-screen">
          <div className="boot-center">
            <img src="/clea-logo-white.png" alt="Clea" className="boot-logo" />
            <p>Starting Clea OS</p>
            <div className="boot-track">
              <span key={bootPhase} className={'boot-fill phase-' + bootPhase} />
            </div>
            <small>
              {
                ['Powering on device', 'Loading system services', 'Starting applications', 'Ready'][
                  bootPhase
                ]
              }
            </small>
          </div>
          <div className="device-bottom">SECO SOM-SMARC-MX95 · simulated boot</div>
        </div>
      );
    return (
      <div className="device-dark">
        <header className="device-topbar">
          <span className="device-indicator">
            <i />
            Clea OS 2.0
          </span>
          <div>
            <span>
              <Wifi size={14} /> Ethernet
            </span>
            <button onClick={reset} disabled={busy}>
              <RotateCcw size={13} /> Reset demo
            </button>
          </div>
        </header>
        {!appOpen ? (
          <main className="device-home">
            <p className="device-overline">DEVICE DESKTOP</p>
            <h1>Good to go.</h1>
            <p>Select an application to connect this device.</p>
            <div className="app-grid">
              <button className="app-tile" onClick={() => setAppOpen(true)}>
                <span className="app-icon">
                  <Cpu size={28} />
                </span>
                <strong>Device Pairing</strong>
                <small>Connect to your workspace</small>
                <ArrowRight size={17} className="app-arrow" />
              </button>
            </div>
            <div className="device-facts">
              <span>SOM-SMARC-MX95</span>
              <span>E88-DEMO-000142</span>
            </div>
          </main>
        ) : (
          <main className="device-pairing">
            <button className="dark-back" onClick={() => setAppOpen(false)}>
              <ArrowLeft size={15} /> Applications
            </button>
            <p className="device-overline">DEVICE PAIRING</p>
            <h1>
              {snapshot.current?.status === 'connected'
                ? 'Connected to Clea.'
                : pairPhase >= 0
                  ? 'Preparing your device.'
                  : snapshot.current &&
                      ['waiting_for_user', 'claimed'].includes(snapshot.current.status)
                    ? 'Pair this device.'
                    : activeStatuses.includes(snapshot.current?.status || 'waiting_for_user')
                      ? 'Connecting to Clea.'
                      : 'Pair this device.'}
            </h1>
            <p className="device-lead">A short code connects your device to your workspace.</p>
            <section className="dark-panel" aria-live="polite">
              {pairPhase >= 0 ? (
                <div className="dark-sequence">
                  <div className="signal-orbit">
                    <span className="orbit one" />
                    <span className="orbit two" />
                    <span className="orbit three" />
                    <Wifi size={24} />
                  </div>
                  <p>
                    {
                      ['Checking network', 'Opening secure channel', 'Creating pairing session'][
                        pairPhase
                      ]
                    }
                    …
                  </p>
                  <div className="sequence-steps">
                    {[0, 1, 2].map((index) => (
                      <span key={index} className={index <= pairPhase ? 'active' : ''} />
                    ))}
                  </div>
                </div>
              ) : !loaded ? (
                <LoaderCircle className="spin" />
              ) : snapshot.current?.status === 'connected' ? (
                <div className="dark-success">
                  <span className="dark-check">
                    <Check size={27} />
                  </span>
                  <h2>Device online</h2>
                  <p>{snapshot.current.claim?.displayName}</p>
                  <Status online>Connected</Status>
                  <div className="dark-status-lines">
                    <span>
                      Cloud connection <strong>Active</strong>
                    </span>
                    <span>
                      Device Manager <strong>Ready</strong>
                    </span>
                  </div>
                </div>
              ) : snapshot.current && activeStatuses.includes(snapshot.current.status) ? (
                <div className="dark-progress">
                  <span className="dark-spinner" />
                  <h2>Connecting your device</h2>
                  <p>{steps[Math.min(snapshot.current.step, steps.length - 1)]}…</p>
                  <div className="dark-progress-track">
                    <span
                      style={{ width: String(Math.min(95, snapshot.current.step * 14 + 8)) + '%' }}
                    />
                  </div>
                </div>
              ) : snapshot.current &&
                ['waiting_for_user', 'claimed'].includes(snapshot.current.status) ? (
                <div className="dark-code">
                  <span className="dark-label">YOUR PAIRING CODE</span>
                  <strong className="dark-code-value">{snapshot.current.shortCode}</strong>
                  <div className="dark-code-meta">
                    <span>Expires in {countdown}</span>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(snapshot.current!.shortCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        } catch {
                          setError('Please copy the code manually.');
                        }
                      }}
                    >
                      <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p>Enter this code at</p>
                  <a href={pairUrl} target="_blank" rel="noopener noreferrer" className="pair-link">
                    localhost:2001/login <ArrowRight size={16} />
                  </a>
                  <small>
                    {snapshot.current.status === 'claimed'
                      ? 'Waiting for confirmation in the platform'
                      : 'Open the link to sign in and pair your device'}
                  </small>
                  <div className="dark-actions">
                    <button onClick={create} disabled={busy}>
                      New code
                    </button>
                    <button onClick={() => void action('cancel')} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dark-ready">
                  <span className="ready-symbol">
                    <Cpu size={26} />
                  </span>
                  <h2>
                    {snapshot.current?.status === 'expired' ? 'Code expired' : 'Ready to pair'}
                  </h2>
                  <p>Generate a one-time code on this device, then enter it in the platform.</p>
                  <button onClick={create} disabled={busy}>
                    Generate pairing code <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
            {error && (
              <p className="dark-error" role="alert">
                {error}
              </p>
            )}
            <p className="device-disclaimer">Local simulation · Example device identifiers</p>
          </main>
        )}
      </div>
    );
  }

  if (pathname === '/login')
    return (
      <div className="login-screen">
        <header>
          <span className="login-brand">Clea 2.0 Device Pairing Demo</span>
          <span>SIMULATED SIGN IN</span>
        </header>
        <main className="login-card">
          <div className="login-mark">
            <ShieldCheck size={24} />
          </div>
          <p className="eyebrow">DEVICE PAIRING</p>
          <h1>Sign in to continue</h1>
          <p>The device is ready. Sign in, then enter its pairing code.</p>
          <form onSubmit={login}>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" defaultValue="demo@clea.local" required />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" defaultValue="DemoPassword123" required />
            <button type="submit" className="primary" disabled={loginBusy}>
              {loginBusy ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          <small>Demo only · credentials are prefilled and never submitted to a service</small>
        </main>
      </div>
    );

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-name">
          <span>W</span>
          <div>
            <strong>Workspace</strong>
            <small>Demo environment</small>
          </div>
        </div>
        <nav>
          <button
            className="active"
            onClick={() => {
              setModal(null);
              window.location.assign('/devices');
            }}
          >
            <Monitor size={17} />
            Devices<span>{snapshot.devices.length}</span>
          </button>
          <button className="muted-nav" type="button">
            <Settings2 size={17} />
            Settings
          </button>
        </nav>
      </aside>
      <div className="platform-workspace">
        <header className="platform-header">
          <span>Demo workspace</span>
          <div>
            <strong className="demo-title">Clea 2.0 Device Pairing Demo</strong>
            <button className="reset-button" onClick={reset}>
              <RotateCcw size={13} />
              Reset demo
            </button>
          </div>
        </header>
        <main className="platform-main">
          <div className="content-heading">
            <div>
              <p className="eyebrow">DEVICE MANAGEMENT</p>
              <h1>Devices</h1>
              <p>Manage devices connected to this workspace.</p>
            </div>
            <button
              className="primary compact"
              onClick={() => {
                setError('');
                setSelectedId(null);
                setModal('method');
              }}
            >
              <Plus size={15} />
              Add device
            </button>
          </div>
          <section className="platform-card list-card">
            <div className="list-head">
              <span>Device</span>
              <span>Hardware</span>
              <span>Status</span>
              <span />
            </div>
            {snapshot.devices.length ? (
              snapshot.devices.map((item) => (
                <button
                  className="device-row"
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setModal('success');
                  }}
                >
                  <span className="device-identity">
                    <span className="device-icon">
                      <Monitor size={17} />
                    </span>
                    <span>
                      <strong>{item.claim?.displayName}</strong>
                      <small>{item.device.serialNumber}</small>
                    </span>
                  </span>
                  <span>{item.device.productName}</span>
                  <Status online>Online</Status>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="list-empty">
                <span className="device-icon large">
                  <Monitor size={21} />
                </span>
                <h2>No devices yet</h2>
                <p>Pair your first device using its temporary code.</p>
                <button
                  className="secondary"
                  onClick={() => {
                    setSelectedId(null);
                    setModal('method');
                  }}
                >
                  Add a device <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="pair-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <header className="modal-top">
              <div>
                <span className="eyebrow">ADD A DEVICE</span>
                <h2 id="modal-title">
                  {modal === 'method'
                    ? 'Choose how to connect'
                    : modal === 'code'
                      ? 'Enter pairing code'
                      : modal === 'confirm'
                        ? 'Confirm your device'
                        : modal === 'progress'
                          ? 'Connecting your device'
                          : modal === 'success'
                            ? 'Device connected'
                            : 'Pairing interrupted'}
                </h2>
              </div>
              <button
                className="modal-close"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                <X size={18} />
              </button>
            </header>
            <div className="modal-steps">
              {['Method', 'Code', 'Confirm', 'Connect'].map((label, index) => {
                const current =
                  modal === 'method' ? 0 : modal === 'code' ? 1 : modal === 'confirm' ? 2 : 3;
                return (
                  <span
                    key={label}
                    className={index === current ? 'current' : index < current ? 'done' : ''}
                  >
                    <b>{index < current ? <Check size={11} /> : index + 1}</b>
                    {label}
                  </span>
                );
              })}
            </div>
            <div className="modal-body" key={modal}>
              {modal === 'method' && (
                <>
                  <p className="modal-intro">Select a pairing method for your device.</p>
                  <button className="modal-method" onClick={() => setModal('code')}>
                    <span className="method-icon">
                      <Wifi size={20} />
                    </span>
                    <span>
                      <strong>Pair with a code</strong>
                      <small>Use the temporary code displayed on your device.</small>
                      <em>Recommended</em>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                  <div className="modal-method disabled">
                    <span className="method-icon">
                      <Settings2 size={20} />
                    </span>
                    <span>
                      <strong>Manual setup</strong>
                      <small>Advanced setup is outside this demo.</small>
                    </span>
                  </div>
                </>
              )}
              {modal === 'code' && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void resolve();
                  }}
                >
                  <p className="modal-intro">
                    Enter the 6-character code displayed on your device.
                  </p>
                  <label htmlFor="pairing-code">Pairing code</label>
                  <input
                    id="pairing-code"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    className="code-input"
                    placeholder="XXX-XXX"
                    value={code}
                    maxLength={9}
                    onChange={(event) => {
                      setCode(event.target.value.toUpperCase());
                      setError('');
                    }}
                  />
                  <p className="input-hint">
                    The code expires after 10 minutes and can only be used once.
                  </p>
                  {code && !/^[A-Z2-9]{3}-?[A-Z2-9]{3}$/i.test(code.trim()) && (
                    <p className="validation">
                      Use 6 letters or numbers, optionally separated by a hyphen.
                    </p>
                  )}
                  {error && (
                    <p className="modal-error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setModal('method')}
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    <button className="primary compact" disabled={busy || !code.trim()}>
                      {busy ? (
                        <>
                          <LoaderCircle className="spin" size={15} /> Finding device…
                        </>
                      ) : (
                        <>
                          Find device <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
              {modal === 'confirm' && session && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void confirm();
                  }}
                >
                  <p className="modal-intro">Is this the device you want to add?</p>
                  <div className="detected">
                    <div>
                      <span className="device-icon">
                        <Cpu size={20} />
                      </span>
                      <strong>SECO {session.device.productName}</strong>
                    </div>
                    <Status online>Ready</Status>
                  </div>
                  <Details session={session} />
                  <label htmlFor="device-name">Device name</label>
                  <input
                    id="device-name"
                    value={name}
                    maxLength={80}
                    required
                    onChange={(event) => setName(event.target.value)}
                  />
                  <div className="modal-footer">
                    <button type="button" className="text-button" onClick={() => setModal('code')}>
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    <button className="primary compact" disabled={busy || !name.trim()}>
                      Pair device <ArrowRight size={15} />
                    </button>
                  </div>
                  {error && (
                    <p className="modal-error" role="alert">
                      {error}
                    </p>
                  )}
                </form>
              )}
              {modal === 'progress' && session && (
                <>
                  <p className="modal-intro">Provisioning your device. This takes a few seconds.</p>
                  <ol className="modal-progress">
                    {steps.map((task, index) => (
                      <li
                        key={task}
                        className={
                          index < session.step ? 'done' : index === session.step ? 'current' : ''
                        }
                      >
                        <span>
                          {index < session.step ? (
                            <Check size={13} />
                          ) : index === session.step ? (
                            <LoaderCircle className="spin" size={13} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <strong>{task}</strong>
                        <small>
                          {index < session.step
                            ? 'Complete'
                            : index === session.step
                              ? 'In progress'
                              : 'Pending'}
                        </small>
                      </li>
                    ))}
                  </ol>
                  <p className="security-note">
                    <ShieldCheck size={16} /> Credentials are simulated and never exposed here.
                  </p>
                </>
              )}
              {modal === 'success' && session && (
                <div className="modal-success">
                  <span className="success-mark">
                    <Check size={27} />
                  </span>
                  <h3>{session.claim?.displayName}</h3>
                  <Status online>Online</Status>
                  <Details session={session} />
                  <div className="health">
                    <span>
                      <CheckCircle2 size={15} />
                      Data connection active
                    </span>
                    <span>
                      <CheckCircle2 size={15} />
                      Device management ready
                    </span>
                  </div>
                  <button
                    className="primary"
                    onClick={() => {
                      setModal(null);
                      setSelectedId(null);
                      setCode('');
                    }}
                  >
                    View device list <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {modal === 'error' && (
                <div className="modal-failure">
                  <span>!</span>
                  <h3>
                    {session?.status === 'failed'
                      ? 'Device stopped responding'
                      : 'Pairing is no longer active'}
                  </h3>
                  <p>
                    {session?.status === 'failed'
                      ? 'The device went offline during provisioning.'
                      : 'Generate a new code on the device and try again.'}
                  </p>
                  <div>
                    {session?.status === 'failed' && (
                      <button className="primary compact" onClick={() => action('retry')}>
                        Retry connection
                      </button>
                    )}
                    <button
                      className="secondary"
                      onClick={() => {
                        setModal('code');
                        setSelectedId(null);
                      }}
                    >
                      Enter another code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
