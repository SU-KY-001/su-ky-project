import type { ReactElement } from "react";
import { floorAreas, galleryPalette as palette, walls } from "../data";
import { SurfaceText } from "./SurfaceText";
import { GalleryFloor } from "./GalleryFloor";

export function GalleryArchitecture(): ReactElement {
  return <group>
    <GalleryFloor />
    {floorAreas.map(area => <group key={area.x}>
      <mesh position={[area.x, 4.4, area.z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[area.width, area.depth]} /><meshBasicMaterial color={palette.ceiling} toneMapped={false} />
      </mesh>
    </group>)}
    {walls.map((wall, index) => {
      const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
      const angle = -Math.atan2(wall.b[1] - wall.a[1], wall.b[0] - wall.a[0]);
      return <group key={index} position={[(wall.a[0] + wall.b[0]) / 2, 0, (wall.a[1] + wall.b[1]) / 2]} rotation={[0, angle, 0]}>
        <mesh position={[0, 2.2, 0]}><boxGeometry args={[length + 0.1, 4.4, 0.24]} /><meshStandardMaterial color={palette.wall} roughness={1} /></mesh>
        <mesh position={[0, 0.04, 0]}><boxGeometry args={[length, 0.08, 0.255]} /><meshStandardMaterial color={palette.trim} roughness={0.8} /></mesh>
      </group>;
    })}
    {/* Lintels keep the rooms continuous above the two walkable openings. */}
    <mesh position={[6, 3.95, -3]}><boxGeometry args={[0.24, 0.9, 4]} /><meshStandardMaterial color={palette.wall} roughness={1} /></mesh>
    <mesh position={[16, 3.95, -8]}><boxGeometry args={[4, 0.9, 0.24]} /><meshStandardMaterial color={palette.wall} roughness={1} /></mesh>
    <SurfaceText position={[3.7, 2.3, -7.85]} width={2.6} height={2.2} lines={[
      { text: "01 / MÙA XUÂN 1975", size: 36, gap: 38, color: palette.muted },
      { text: "Đường đến Sài Gòn", size: 138, serif: true, gap: 40 },
      { text: "Từ những bước tiến mùa xuân đến cánh cửa của ngày toàn thắng.", size: 39 },
      { text: "CHƯƠNG TIẾP THEO  →", size: 28, gap: 0 },
    ]} />
    <SurfaceText position={[13.5, 2.35, 3.85]} rotation={Math.PI} width={1.6} height={1.9} lines={[
      { text: "30.04", size: 180, serif: true }, { text: "1975", size: 180, serif: true, gap: 55 },
      { text: "Ngày toàn thắng", size: 80, serif: true },
    ]} />
    <SurfaceText position={[10.18, 2.3, -19.4]} rotation={Math.PI / 2} width={2.6} height={2.1} lines={[
      { text: "03 / SAU NGÀY TOÀN THẮNG", size: 34, color: palette.muted, gap: 36 },
      { text: "Đất nước liền một dải", size: 128, serif: true, gap: 35 },
      { text: "Dừng lại một chút. Trong những gương mặt ấy là một cuộc sống mới đang bắt đầu.", size: 38 },
    ]} />
  </group>;
}
