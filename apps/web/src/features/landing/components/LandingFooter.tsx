import { ArrowRight, FacebookLogo, InstagramLogo, YoutubeLogo } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LandingFooter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setMessage(valid ? "Đã ghi nhận. Chúng tôi sẽ gửi thư khi kho sử mở cửa." : "Vui lòng nhập một địa chỉ email hợp lệ.");
  };

  return (
    <footer role="contentinfo" id="signup" className="bg-night text-paper-soft">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-5 py-20 md:px-7 md:py-28">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="flex max-w-[700px] flex-1 flex-col gap-4">
            <h2 className="font-serif text-3xl font-bold leading-tight md:text-5xl">Đừng chỉ nhớ một năm. Hãy nhớ câu chuyện.</h2>
            <p className="text-base leading-7 text-paper-deep">Nhận thông báo về series mới và bắt đầu hành trình nghe sử theo cách của bạn.</p>
          </div>
          <form onSubmit={submit} className="flex w-full max-w-[500px] flex-1 flex-col gap-2">
            <Label htmlFor="signup-email" className="text-paper-soft">Email của bạn</Label>
            <div className="flex items-center gap-2 rounded-md border border-bronze bg-night-soft p-1 focus-within:ring-2 focus-within:ring-paper-soft">
              <Input
                id="signup-email"
                type="email"
                className="h-11 border-0 bg-transparent text-paper-soft shadow-none placeholder:text-paper-deep focus-visible:ring-0"
                placeholder="ban@example.com"
                autoCapitalize="none"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby="signup-message"
              />
              <Button type="submit" size="icon" className="h-11 w-12 shrink-0 rounded-sm bg-vermilion text-paper-soft hover:bg-vermilion-dark" aria-label="Đăng ký nhận thông báo">
                <ArrowRight size={20} />
              </Button>
            </div>
            <p id="signup-message" aria-live="polite" className={`text-xs ${message.startsWith("Đã") ? "text-bronze" : "text-paper-deep"}`}>
              {message || "Không gửi thư rác. Bạn có thể hủy đăng ký bất cứ lúc nào."}
            </p>
          </form>
        </div>

        <Separator className="bg-bronze-dark" />
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded bg-vermilion font-serif text-lg font-bold text-paper-soft">Sử</span>
            <span className="flex flex-col"><span className="font-serif text-xl font-bold">Sử Ký</span><span className="text-xs text-paper-deep">Nghe sử bằng chính giọng người trong cuộc</span></span>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm text-paper-deep" aria-label="Liên kết chân trang">
            <span>Điều khoản</span>
            <span>Quyền riêng tư</span>
            <span>Liên hệ</span>
          </nav>
          <div className="flex gap-3">
            <Button variant="ghost" size="icon" className="text-paper-deep hover:bg-white/10 hover:text-paper-soft" aria-label="Facebook"><FacebookLogo size={20} /></Button>
            <Button variant="ghost" size="icon" className="text-paper-deep hover:bg-white/10 hover:text-paper-soft" aria-label="YouTube"><YoutubeLogo size={20} /></Button>
            <Button variant="ghost" size="icon" className="text-paper-deep hover:bg-white/10 hover:text-paper-soft" aria-label="Instagram"><InstagramLogo size={20} /></Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
