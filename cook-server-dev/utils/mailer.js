import nodemailer from "nodemailer";

export async function sendVerifyEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"쿠킹메이트" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "쿠킹메이트 이메일 인증번호",
    html: `
      <h2>이메일 인증번호</h2>
      <p>아래 인증번호를 회원가입 화면에 입력해주세요.</p>
      <h1 style="letter-spacing:4px;">${otp}</h1>
      <p>⏰ 유효시간: 5분</p>
    `,
  });
}
