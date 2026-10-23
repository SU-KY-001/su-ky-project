export interface Witness { id: string; name: string; role: string; quote: string }
export interface RiverEvent { id: string; name: string; year: string; location: string; question: string; artifact: string; audioId: string; duration: number; distance: number; side: number; witnesses: Witness[] }
export interface Era { id: string; name: string; years: string; question: string; stages: { id: string; name: string; events: RiverEvent[] }[]; water: string; sky: string; bank: string }
export const perspectives = ['Người lính', 'Người dân', 'Sứ thần'] as const;
export type Perspective = typeof perspectives[number];
const eraNames = ['Dựng nước', 'Nghìn năm Bắc thuộc', 'Đại Việt', 'Lê – Nguyễn', 'Cận hiện đại'];
const years = ['Hùng Vương – An Dương Vương', '179 TCN – 938', 'Ngô – Đinh – Lê – Lý – Trần', 'Lê sơ – Tây Sơn – Nguyễn', 'Pháp thuộc – thống nhất'];
const questions = ['Một đất nước bắt đầu từ những câu chuyện nào?', 'Điều gì khiến một lời hiệu triệu vượt qua sợ hãi?', 'Ai đã đứng bên dòng sông khi vận nước đổi thay?', 'Cùng một biến động, mỗi người nhớ điều gì?', 'Điều gì còn ở lại sau những cuộc chia ly?'];
const palettes = [['#a5b2b4', '#e0e3e3', '#909b91'], ['#858d96', '#b7bcc3', '#777e80'], ['#b6b09c', '#e4e0d5', '#96968a'], ['#929b98', '#cdd3ce', '#7b857e'], ['#b0b7bd', '#e0e3e6', '#959b9d']];

export const eras: Era[] = eraNames.map((name, era) => ({
  id: `era-${era + 1}`, name, years: years[era], question: questions[era],
  water: palettes[era][0], sky: palettes[era][1], bank: palettes[era][2],
  stages: Array.from({ length: 3 }, (_, stage) => {
    const id = `era-${era + 1}-event-${stage + 1}`;
    const sample = era === 1 && stage === 0;
    return { id: `era-${era + 1}-stage-${stage + 1}`, name: `[Giai đoạn ${stage + 1}]`, events: [{
      id, name: sample ? 'Khởi nghĩa Hai Bà Trưng' : `[Tên sự kiện ${stage + 1}]`,
      year: sample ? '40' : '[Năm]', location: sample ? 'Mê Linh' : '[Địa danh]',
      question: sample ? 'Bạn sẽ nghe lời hiệu triệu ấy từ góc nhìn nào?' : '[Điều gì đã xảy ra ở bến sông này?]',
      artifact: '[Tên cổ vật]', audioId: `demo-${id}`, duration: 30,
      distance: era * 100 + [22, 52, 78][stage], side: stage % 2 === 0 ? -1 : 1,
      witnesses: [
        { id: `${id}-w1`, name: sample ? 'Bà Trưng Trắc' : '[Tên chứng nhân 1]', role: sample ? 'Chứng nhân của câu chuyện mẫu' : '[Vai trò]', quote: '[Câu thoại mẫu — chờ biên tập, không phải trích dẫn lịch sử.]' },
        { id: `${id}-w2`, name: '[Tên chứng nhân 2]', role: '[Vai trò]', quote: '[Một ký ức khác về cùng sự kiện — nội dung chờ biên tập.]' },
      ],
    }] };
  }),
}));
export const events = eras.flatMap(era => era.stages.flatMap(stage => stage.events));
export const riverX = (distance: number): number => Math.sin(distance / 34) * 6;
export const formatTime = (seconds: number): string => `00:${Math.floor(seconds).toString().padStart(2, '0')}`;
