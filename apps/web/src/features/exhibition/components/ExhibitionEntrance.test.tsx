import { expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ExhibitionEntrance } from "./ExhibitionEntrance";

it("renders the exhibition's own title and counts with the project logo", () => {
  const html = renderToStaticMarkup(<ExhibitionEntrance title="Ký ức Hà Nội" subtitle="Một hành trình" description="Ảnh tư liệu" artworkCount={7} chapterCount={2} ready available onEnter={mock(() => undefined)} />);
  expect(html).toContain("Ký ức Hà Nội");
  expect(html).toContain("7 ảnh tư liệu");
  expect(html).toContain("2 chương");
  expect(html).toContain("Sử Ký Việt Nam");
  expect(html).toContain("Bước vào triển lãm");
  expect(html).toContain("exhibition-cover-title-accent");
  expect(html).not.toContain("1975");
});

it("keeps the entrance disabled until the scene is ready", () => {
  const html = renderToStaticMarkup(<ExhibitionEntrance title="Triển lãm" subtitle="" description="" artworkCount={0} chapterCount={1} ready={false} available onEnter={() => {}} />);
  expect(html).toContain("disabled");
  expect(html).toContain("Đang chuẩn bị không gian");
});
