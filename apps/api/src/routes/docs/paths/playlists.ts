import { PlaylistPageQuerySchema, PlaylistNameSchema, PlaylistIdSchema, PlaylistItemParamSchema, AddPlaylistItemSchema, ReorderPlaylistSchema, PlaylistSchema, PlaylistListSchema, PlaylistDetailSchema } from "@repo/shared";
import { operation, type Paths } from "../operation";

const tag = "Playlists";
const owner = "Mọi role đăng nhập quản lý playlist riêng tư của chính mình. Owner lấy từ session; không nhận ownerId/userId. Playlist không tồn tại hoặc thuộc tài khoản khác đều trả404. ";
const errors = { 404: "`NOT_FOUND`: không tìm thấy playlist của bạn" };
const metadata = { name: "Playlist", schema: PlaylistSchema };
export const playlistPaths: Paths = {
  "/api/me/playlists": {
    get: operation({ id: "listMyPlaylists", tag, summary: "Danh sách playlist cá nhân", access: "user", description: owner + "Sort updatedAt DESC/ID ASC. Mặc định preview4; mọi trang tối đa50.", query: PlaylistPageQuerySchema, ok: { status: 200, description: "Playlist phân trang", schema: { name: "PlaylistList", schema: PlaylistListSchema } } }),
    post: operation({ id: "createMyPlaylist", tag, summary: "Tạo playlist riêng tư", access: "user", description: owner + "Tên trim,1–100 ký tự. Retry cùng Idempotency-Key không tạo trùng playlist.", rate: "write", idempotent: true, body: { name: "PlaylistName", schema: PlaylistNameSchema }, ok: { status: 201, description: "Playlist mới", schema: metadata, location: "/api/me/playlists/{id}" } }),
  },
  "/api/me/playlists/{id}": {
    get: operation({ id: "getMyPlaylist", tag, summary: "Đọc playlist và các tập theo thứ tự", access: "user", description: owner + "Items phân trang theo position/episode ID. Tập ẩn/xóa mềm/hết audio giữ metadata nhưng available=false và narrations=[]. Audio URL lấy qua API playback hiện có, không trả URL tĩnh hoặc thay player. Xóa cứng tập sẽ bỏ item tương ứng; position có thể có khoảng trống sau bỏ tập.", pathParams: PlaylistIdSchema, query: PlaylistPageQuerySchema, ok: { status: 200, description: "Playlist và trang tập", schema: { name: "PlaylistDetail", schema: PlaylistDetailSchema } }, errors }),
    patch: operation({ id: "renameMyPlaylist", tag, summary: "Đổi tên playlist", access: "user", description: owner, pathParams: PlaylistIdSchema, rate: "write", body: { name: "PlaylistName", schema: PlaylistNameSchema }, ok: { status: 200, description: "Playlist đã đổi tên", schema: metadata }, errors }),
    delete: operation({ id: "deleteMyPlaylist", tag, summary: "Xóa playlist và toàn bộ items", access: "user", description: owner + "Chỉ xóa playlist/items, không xóa tập hay tiến độ nghe.", pathParams: PlaylistIdSchema, rate: "write", ok: { status: 204, description: "Đã xóa" }, errors }),
  },
  "/api/me/playlists/{id}/items": {
    post: operation({ id: "addMyPlaylistEpisode", tag, summary: "Thêm một tập vào cuối playlist", access: "user", description: owner + "Chỉ nhận episodeId công khai, có audio READY. Không nhận seriesId. Thêm trùng tập trả playlist hiện tại (không nhân đôi). Mỗi playlist tối đa500 tập. Lock playlist trong transaction để các add/remove/reorder không đè nhau.", pathParams: PlaylistIdSchema, rate: "write", body: { name: "AddPlaylistItem", schema: AddPlaylistItemSchema }, ok: { status: 200, description: "Metadata sau thêm hoặc retry", schema: metadata }, errors: { ...errors, 409: "`CONFLICT`: playlist đã đủ500 tập", 422: "`VALIDATION_ERROR`: tập không công khai hoặc không có audio phát được" } }),
  },
  "/api/me/playlists/{id}/items/{episodeId}": {
    delete: operation({ id: "removeMyPlaylistEpisode", tag, summary: "Bỏ một tập khỏi playlist", access: "user", description: owner + "Bỏ tập không có trong playlist cũng thành công, không làm thay đổi tập/player/progress.", pathParams: PlaylistItemParamSchema, rate: "write", ok: { status: 200, description: "Metadata sau khi bỏ tập", schema: metadata }, errors }),
  },
  "/api/me/playlists/{id}/items/order": {
    put: operation({ id: "reorderMyPlaylist", tag, summary: "Sắp xếp lại toàn bộ tập trong playlist", access: "user", description: owner + "Gửi episodeIds đúng toàn bộ tập hiện tại, mỗi ID một lần theo thứ tự muốn lưu (kể cả tập unavailable). Đọc đủ các trang trước khi reorder. Thiếu/thừa tập do thay đổi đồng thời trả409; client tải lại rồi thử lại. Mảng rỗng chỉ hợp lệ cho playlist rỗng.", pathParams: PlaylistIdSchema, rate: "write", body: { name: "ReorderPlaylist", schema: ReorderPlaylistSchema }, ok: { status: 200, description: "Đã lưu thứ tự", schema: metadata }, errors: { ...errors, 409: "`CONFLICT`: tập gửi lên không khớp toàn bộ tập hiện tại" } }),
  },
};
