import { useRef, type ReactElement } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { eras, events, formatTime, perspectives } from './data';
import { useRiverStore } from './riverStore';
import { ArtifactViewer } from './RiverScene';

export function RiverPanels(): ReactElement {
  const s = useRiverStore();
  const focus = useRef<HTMLDivElement>(null);
  const era = eras[s.era];
  const event = events.find(e => e.id === s.eventId)!;
  const audio = events.find(e => e.id === s.audioEventId) ?? event;
  const witness = audio.witnesses.find(w => w.id === s.witnessId) ?? audio.witnesses[0];
  const earned = s.completed.includes(audio.id);
  const titles = { help: 'Bạn là người lái đò.', gate: era.name, event: event.name, player: witness.name, map: 'Một dòng sông. Năm thời kỳ.', settings: 'Cài đặt chuyến đi' };
  return <Dialog open={s.panel !== null} onOpenChange={open => { if (!open) s.close(); }}>
    <DialogContent ref={focus} tabIndex={-1} showCloseButton={false} className={`river-ui river-dialog ${s.panel === 'event' ? 'river-drawer' : ''} ${s.panel === 'map' ? 'river-map-dialog' : ''}`} onOpenAutoFocus={e => { e.preventDefault(); focus.current?.focus(); }} onCloseAutoFocus={e => { e.preventDefault(); document.getElementById('river-stage')?.focus(); }}>
      <div className="river-dialog-top"><span>SỬ KÝ / {s.panel === 'player' ? 'LẮNG NGHE' : 'DÒNG SÔNG LỊCH SỬ'}</span><button onClick={s.close} aria-label="Đóng và quay lại chèo đò">Esc · Đóng ×</button></div>
      <DialogTitle className="river-title">{s.panel ? titles[s.panel] : ''}</DialogTitle>
      <DialogDescription className="river-description">{s.panel === 'gate' ? era.years : s.panel === 'event' ? `${event.year} · ${event.location}` : 'Prototype tương tác · Nội dung và audio minh họa, chưa có bản thu thật.'}</DialogDescription>

      {s.panel === 'help' && <>
        <p className="river-lead">Không chọn tập từ một danh sách. Hãy chèo đến câu chuyện khiến bạn muốn dừng lại.</p>
        <div className="river-steps"><article><b>01 / Chèo qua sương</b><p>Đi tới đâu, dòng sông sáng tới đó. Năm khúc sông là năm thời kỳ.</p></article><article><b>02 / Ghé một bến lạ</b><p>Lại gần cột sáng hoặc hình người. Nhấn E để nghe câu hỏi phía sau cột mốc.</p></article><article><b>03 / Mang ký ức về</b><p>Chọn góc nhìn, nghe đủ tập mẫu 30 giây để sưu tầm cổ vật và chứng nhân.</p></article></div>
        <div className="river-key-table"><span><kbd>W / ↑</kbd> Chèo tới</span><span><kbd>Shift</kbd> Chèo nhanh</span><span><kbd>A D / ← →</kbd> Lái hai bên</span><span><kbd>S / ↓</kbd> Hãm; nhấn lần nữa thả neo</span><span><kbd>E</kbd> Cập bến</span><span><kbd>M</kbd> Bản đồ</span><span><kbd>Space</kbd> Phát / tạm dừng</span><span><kbd>Enter / Esc</kbd> Xác nhận / quay lại</span></div>
        <p className="river-note">Nhấn W để nhổ neo. Có thể dùng toàn bộ nút trên màn hình. Tiến độ chỉ lưu trong bộ nhớ phiên app; tải lại trang sẽ bắt đầu lại.</p>
        <button className="river-primary" onClick={() => s.open('gate')}>Space · Bắt đầu chuyến đi →</button>
      </>}

      {s.panel === 'gate' && <>
        <div className="river-era-number">CỔNG THỜI KỲ <b>0{s.era + 1}</b> / 05</div>
        <p className="river-lead">“{era.question}”</p>
        <div className="river-steps">{era.stages.map((stage, index) => <article key={stage.id}><small>CHẶNG 0{index + 1}</small><h3>{stage.name}</h3><p>{stage.events[0].name}</p></article>)}</div>
        <div className="river-stats"><span><b>3</b> sự kiện</span><span><b>6</b> chứng nhân</span><span><b>3</b> cổ vật</span></div>
        <p className="river-note">Số lượng nội dung mẫu của prototype, không phải số liệu lịch sử.</p>
        <div className="river-actions"><button className="river-primary" onClick={s.close}>Space · Bắt đầu chèo →</button><button onClick={s.close}>Esc · Quay lại</button></div>
      </>}

      {s.panel === 'event' && <>
        <p className="river-lead">“{event.question}”</p>
        <div className="river-artifact"><ArtifactViewer /><span>{event.artifact} · Kéo chuột để xoay</span></div>
        <p className="river-note">Khối 3D minh họa vị trí cổ vật, chưa tái dựng hiện vật lịch sử.</p>
        <h3>Cùng sự kiện. Ba góc nhìn.</h3>
        <div className="river-actions" role="group" aria-label="Góc nhìn kể chuyện">{perspectives.map(p => <button key={p} aria-pressed={s.perspective === p} onClick={() => useRiverStore.setState({ perspective: p })}>{p}</button>)}</div>
        <p className="river-note">{s.perspective === 'Người lính' ? '[Câu chuyện từ nơi đối mặt biến động.]' : s.perspective === 'Người dân' ? '[Câu chuyện từ cuộc sống bên bờ sông.]' : '[Câu chuyện qua một cuộc gặp gỡ.]'}</p>
        <h3>Những người giữ ký ức</h3>
        {event.witnesses.map(w => <button className="river-witness-row" key={w.id} aria-pressed={s.witnessId === w.id} onClick={() => useRiverStore.setState({ witnessId: w.id })}><span className="river-person" aria-hidden="true">♟</span><span><b>{w.name}</b><small>{w.role}</small></span><span>{s.witnesses.includes(w.id) ? '✓ Đã gặp' : '▣ Chưa sưu tầm'}</span></button>)}
        <button className="river-primary" onClick={() => s.listen(event.id, s.perspective, s.witnessId)}>Enter · Nghe tập · 00:30 →</button>
        <p className="river-note">Nghe hết để mở khóa bộ sưu tập. Có thể nghe thử mọi chứng nhân.</p>
      </>}

      {s.panel === 'player' && <>
        <div className="river-player-heading"><div className="river-portrait" aria-label="Chân dung minh họa chứng nhân">♟<small>CHÂN DUNG MẪU</small></div><div><p>{audio.name} · {s.perspective}</p><blockquote aria-live="polite">{s.elapsed < 10 ? witness.quote : s.elapsed < 20 ? `[Lời kể từ góc nhìn ${s.perspective.toLowerCase()} — câu thứ hai đang được biên tập.]` : '[Câu chuyện khép lại. Một ký ức mới ở lại với người lái đò.]'}</blockquote><small>Phụ đề minh họa · Không phải lời nói được ghi chép của nhân vật.</small></div></div>
        <div className={`river-wave ${s.playing && !s.reducedMotion ? 'playing' : ''}`} aria-hidden="true">{Array.from({ length: 60 }, (_, i) => <i key={i} style={{ height: `${14 + (Math.sin(i * 2.7) + 1) * 26}px`, opacity: i / 60 <= s.elapsed / 30 ? 1 : .25 }} />)}</div>
        <label className="river-progress-label">Tiến trình <input type="range" min={0} max={30} step={.1} value={s.elapsed} onChange={e => s.seek(Number(e.target.value))} /></label>
        <div className="river-time"><span>{formatTime(s.elapsed)} / 00:30</span><span>Audio mô phỏng bằng timer</span></div>
        <div className="river-actions river-play-actions"><button onClick={() => s.seek(s.elapsed - 15)}>↶ 15 giây</button><button className="river-primary" onClick={s.togglePlay}>{s.playing ? 'Ⅱ Tạm dừng' : s.elapsed >= 29.999 ? '↻ Nghe lại' : '▶ Tiếp tục'} · Space</button><button onClick={() => s.seek(s.elapsed + 15)}>15 giây ↷</button><button aria-label="Đổi tốc độ phát" onClick={() => useRiverStore.setState({ rate: s.rate === 1 ? 1.5 : s.rate === 1.5 ? 2 : 1 })}>{s.rate}×</button></div>
        <div className="river-player-bottom"><section><h3>Các chương</h3>{['Bên bờ câu chuyện', 'Một góc nhìn khác', 'Điều còn ở lại'].map((name, i) => <button className="river-chapter" key={name} onClick={() => s.seek(i * 10)} aria-current={Math.min(2, Math.floor(s.elapsed / 10)) === i ? 'true' : undefined}>{formatTime(i * 10)} <span>{name}</span></button>)}</section><section className="river-reward" aria-live="polite"><h3>{earned ? '✓ Đã mở khóa' : 'Ký ức mang về'}</h3><p>{audio.artifact}</p><p>{audio.witnesses.map(w => w.name).join(' · ')}</p><small>{earned ? 'Đã thêm vào bộ sưu tập của chuyến đi.' : 'Nghe liên tục đủ 30 giây nội dung. Tua/chuyển chương sẽ bắt đầu lại lượt tính thưởng.'}</small></section></div>
        <div className="river-actions"><button className="river-primary" onClick={s.close}>Quay lại chèo đò →</button><button onClick={() => s.open('event')}>Đổi góc nhìn</button></div>
      </>}

      {s.panel === 'map' && <>
        <p>Những bến đã qua vẫn ở đây. Phần sông phía trước đang chờ bạn khám phá.</p>
        <div className="river-map-cards">{eras.map((e, i) => {
          const unlocked = s.visited.includes(i);
          const complete = e.stages.every(stage => stage.events.every(ev => s.completed.includes(ev.id)));
          return <button key={e.id} className={`river-map-card ${!unlocked ? 'fogged' : ''}`} aria-pressed={s.selectedEra === i} onClick={() => useRiverStore.setState({ selectedEra: i })}><span className="river-map-node">{complete ? '✓' : `0${i + 1}`}</span><small>{complete ? 'HOÀN THÀNH' : i === s.era ? 'ĐANG CHÈO' : unlocked ? 'ĐÃ KHÁM PHÁ' : 'CHƯA MỞ · SƯƠNG MÙ'}</small><h3>{e.name}</h3><p>{e.years}</p><span>{unlocked ? e.question : 'Chèo tới để hé lộ câu chuyện.'}</span></button>;
        })}</div>
        <div className="river-stats"><span><b>{s.completed.length}/15</b> đã nghe</span><span><b>{s.artifacts.length}</b> cổ vật</span><span><b>{s.witnesses.length}</b> chứng nhân</span></div>
        <p className="river-note">← → chọn thời kỳ · Enter di chuyển · Esc quay lại. Thời kỳ chưa mở phải được khám phá bằng thuyền.</p>
        <button className="river-primary" disabled={!s.visited.includes(s.selectedEra)} onClick={() => s.travel(s.selectedEra)}>Enter · Chèo tới {eras[s.selectedEra].name} →</button>
      </>}

      {s.panel === 'settings' && <>
        <p>Điều chỉnh để chuyến đi thoải mái hơn.</p>
        <button aria-pressed={s.reducedMotion} onClick={() => useRiverStore.setState({ reducedMotion: !s.reducedMotion })}>Giảm chuyển động thuyền: {s.reducedMotion ? 'Bật' : 'Tắt'}</button>
        <button aria-pressed={!s.muted} onClick={() => useRiverStore.setState({ muted: !s.muted })}>Âm thanh: {s.muted ? 'Tắt' : 'Bật'} · bản mẫu chưa có audio</button>
        <p className="river-note">UI xám và hình khối đơn giản dành chỗ cho tranh Đông Hồ, họa tiết trống đồng và tài sản 3D được thẩm định sau này.</p>
        <button className="river-primary" onClick={s.close}>Trở về dòng sông</button>
      </>}
    </DialogContent>
  </Dialog>;
}
