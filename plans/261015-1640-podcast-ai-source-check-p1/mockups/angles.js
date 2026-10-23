// Kho góc kể dùng chung cho 02 (chọn) và 06 (quản lý). Mock lưu ở localStorage; bản thật: bảng ai_narrative_angles theo userId.
const ANGLES = {
  KEY: "su-ky.mock.angles.v1",
  builtins: [
    { id: "b1", name: "Chuỗi sự kiện", desc: "Trước, trong, sau.", guide: "Kể theo trình tự thời gian: bối cảnh trước, diễn biến chính, hệ quả sau.", builtin: true },
    { id: "b2", name: "Nhân vật", desc: "Kể qua một người.", guide: "Chọn một nhân vật làm sợi chỉ xuyên suốt; sự kiện hiện ra qua lựa chọn và cảm nhận của họ.", builtin: true },
    { id: "b3", name: "Nguyên nhân – hệ quả", desc: "Vì sao, rồi sao.", guide: "Mở bằng câu hỏi vì sao; lần lượt gỡ từng nguyên nhân rồi kể hệ quả.", builtin: true },
    { id: "b4", name: "Đối lập", desc: "Hai phía, hai lựa chọn.", guide: "Đặt hai phía hoặc hai phương án cạnh nhau; để người nghe thấy cái giá của mỗi lựa chọn.", builtin: true },
  ],
  mine() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
  save(list) { localStorage.setItem(this.KEY, JSON.stringify(list)); },
  all() { return [...this.builtins, ...this.mine()]; },
};
