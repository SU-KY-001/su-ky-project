import type { ReactElement } from 'react';
import { eras, events, formatTime } from './data';
import { nearbyMarker, useRiverStore } from './riverStore';
import { RiverScene } from './RiverScene';
import { RiverPanels } from './RiverPanels';
import { useRiverControls } from './useRiverControls';
import './history-river.css';

export function HistoryRiver(): ReactElement {
  const s = useRiverStore();
  useRiverControls();
  const era = eras[s.era];
  const nearby = nearbyMarker(s.distance, s.lateral);
  const event = events.find(e => e.id === nearby?.eventId);
  const audio = events.find(e => e.id === s.audioEventId);
  const mapY = (progress: number): number => 32 + Math.sin(progress / 11) * 16;
  const mapPath = Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${10 + i * 1.8},${mapY(i)}`).join(' ');
  return <main className="river-ui river-app" id="river-stage" tabIndex={-1}>
    <header className="river-header"><button onClick={() => s.open('help')}>☰ Menu / Hướng dẫn</button><div className="river-badge"><b>THỜI KỲ {s.era + 1}/5 · {era.name}</b><span>{era.years}</span></div><div className="river-actions"><button aria-pressed={!s.muted} onClick={() => useRiverStore.setState({ muted: !s.muted })}>Âm thanh: {s.muted ? 'Tắt' : 'Bật'}*</button><button onClick={() => s.open('settings')}>Cài đặt</button></div></header>
    <nav className="river-timeline" aria-label="Tiến độ qua năm thời kỳ">{eras.map((e, i) => <button key={e.id} className={i === s.era ? 'current' : ''} aria-current={i === s.era ? 'step' : undefined} onClick={() => { useRiverStore.setState({ selectedEra: i }); s.open('map'); }}><span>0{i + 1}</span>{e.name}<i style={{ width: `${Math.max(0, Math.min(100, s.frontier - i * 100))}%` }} /></button>)}</nav>
    <div className="river-viewport"><RiverScene /></div>
    <div className="river-scene-caption"><span>CHUYẾN ĐI QUA KÝ ỨC</span><h1>Dòng sông lịch sử</h1><p>{s.distance >= 498 ? 'Bạn đã đi hết dòng sông. Những câu chuyện vẫn còn chờ ở các bến.' : 'Phía sau màn sương, ai đang đợi bạn?'}</p></div>
    <div className="river-status"><span>{s.anchored ? '⚓ Đang thả neo' : s.velocity > 1 ? '≈ Đang chèo' : 'Giữ W / ↑ để chèo tới'}</span><small>{Math.round(s.distance / 5)}% dòng sông đã đi · {s.completed.length} ký ức đã nghe</small></div>
    {nearby && event && !s.panel && <button className="river-dock" onClick={() => s.dock(nearby.eventId, nearby.witnessId)}><span>{nearby.witnessId ? 'CHỨNG NHÂN ĐANG CHỜ' : 'MỘT CÂU CHUYỆN BÊN BỜ'}</span><b>{event.question}</b><span><kbd>E</kbd> Cập bến – nghe câu chuyện →</span></button>}
    <footer className="river-bottom"><section className="river-controls"><div className="river-control-head"><b>BÀN CHÈO</b><button onClick={() => s.open('help')}>? Hướng dẫn</button></div><p><kbd>W ↑</kbd> Tới <kbd>Shift</kbd> Nhanh <kbd>A D</kbd> Lái <kbd>S ↓</kbd> Hãm / neo</p><div className="river-actions"><button aria-label="Lái trái" onClick={() => useRiverStore.setState({ lateral: Math.max(-5.5, s.lateral - 1.5) })}>←</button><button aria-pressed={s.cruise} onClick={() => useRiverStore.setState({ cruise: !s.cruise, anchored: false })}>{s.cruise ? 'Dừng chèo' : 'Chèo tới ↑'}</button><button aria-label="Lái phải" onClick={() => useRiverStore.setState({ lateral: Math.min(5.5, s.lateral + 1.5) })}>→</button><button onClick={s.brake}>Hãm / neo</button></div></section>
      <section className="river-mini-player"><small>{audio ? s.playing ? 'ĐANG PHÁT · MÔ PHỎNG' : 'ĐÃ TẠM DỪNG / KẾT THÚC' : 'LẮNG NGHE DÒNG LỊCH SỬ'}</small><b>{audio?.name ?? 'Một câu chuyện đang đợi ở bến tiếp theo'}</b><div className="river-actions"><button disabled={!audio} onClick={s.togglePlay}>{s.playing ? 'Ⅱ' : '▶'} Space</button><span>{formatTime(s.elapsed)} / {audio ? '00:30' : '00:00'}</span>{audio && <button onClick={() => s.open('player')}>Mở tập</button>}</div><small>* Chưa có âm thanh thật</small></section>
      <button className="river-minimap" onClick={() => { useRiverStore.setState({ selectedEra: s.era }); s.open('map'); }}><b>M · Bản đồ sông ↗</b><svg viewBox="0 0 200 65" aria-label="Vị trí thuyền trên dòng sông"><path d={mapPath} fill="none" stroke="#aaa" strokeWidth="7" /><path d={mapPath} fill="none" stroke="#333" strokeWidth="3" pathLength={100} strokeDasharray={`${s.frontier / 5} 100`} />{eras.map((e, i) => <circle key={e.id} cx={10 + i * 36} cy={mapY(i * 20)} r={4} fill={s.visited.includes(i) ? '#222' : '#ddd'} stroke="#222" />)}<circle cx={10 + s.distance / 5 * 1.8} cy={mapY(s.distance / 5)} r={6} fill="#fff" stroke="#111" strokeWidth={2} /></svg><small>{s.artifacts.length} cổ vật · {s.witnesses.length} chứng nhân</small></button>
    </footer>
    <RiverPanels />
  </main>;
}
