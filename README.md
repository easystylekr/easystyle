<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18B6H8V0k66sL9dtdWLakeyrFEbPKUvny

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# easystyle

## Tailwind CSS (PostCSS)

이 프로젝트는 CDN 대신 PostCSS 기반 Tailwind를 사용합니다.

1) 의존성 설치: `npm install`
   - devDependencies: `tailwindcss`, `postcss`, `autoprefixer` (package.json에 포함됨)
2) 설정 파일: `tailwind.config.ts`, `postcss.config.js`
3) 스타일 엔트리: `index.tsx`에서 `import './index.css'` (내부에 `@tailwind` 지시자 포함)

주의: PostCSS 의존성이 설치되지 않은 상태에서 스타일이 깨질 수 있습니다. 바로 복구를 위해 개발 단계에서는 `index.html`에 Tailwind CDN을 임시로 남겨두었습니다. 배포 전에는 CDN 스크립트를 제거해 주세요.
반드시 `npm install` 후 실행해야 PostCSS 기반 Tailwind가 정상 동작합니다.

### 환경변수 (선택 항목)
- `VITE_AUTH_DEBUG=true`로 설정하면 Auth 처리 시간/오류 로그가 브라우저 콘솔에 출력됩니다.
- `VITE_AUTH_TIMEOUT_MS=30000` 인증 요청 타임아웃(ms) 조정. 네트워크가 느린 환경에서 유용.

## Auth Setup (Supabase)

1. Create a Supabase project and enable Email auth.
2. Add to `.env.local`:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
3. Optional: switch style provider by adding `VITE_STYLE_PROVIDER=nanobanana` (default: `gemini`).
4. MVP 범위: 이메일 가입만 사용 (SNS 로그인 미사용)
   - Email Provider만 활성화하세요. Confirm email(이메일 확인)은 운영 정책에 맞게 On/Off 선택 가능합니다.
   - URL 설정: Site URL 또는 Additional Redirect URLs에 현재 도메인(예: `http://localhost:5173`)을 포함해야 확인 메일 링크가 정상 동작합니다.

### 로그인/회원가입 UX
- 이메일/비밀번호: 최소 6자, 유효한 이메일 형식 필요.
- 이메일 확인(옵션): 회원가입 후 세션이 없으면 확인 메일 안내 표시. "확인 이메일 재전송" 버튼 제공.
- 비밀번호 재설정: 이메일 입력 후 "비밀번호 재설정" 버튼으로 메일 전송(redirect: 현재 도메인).
- 가입 확인 메일 리다이렉트: 코드에서 `emailRedirectTo = window.location.origin`을 사용합니다. Supabase URL 설정의 Site URL 또는 Additional Redirect URLs에 현재 도메인이 포함되어야 합니다.
- 네트워크 안정성: 회원가입/로그인 요청은 15초 타임아웃을 적용합니다. 지연될 경우 사용자에게 안내하고 버튼 상태를 복구합니다.
 - 로그아웃 안정성: 로그아웃 시 Supabase 세션 이벤트 지연에 대비해 로컬/세션 스토리지의 `sb-*-auth-token` 등 관련 키를 정리하고 UI를 즉시 업데이트합니다.
 - 로그아웃 문제 해결: 드물게 세션이 남는 경우가 있어, `local → global` 순으로 signOut을 시도하고 마지막에 페이지를 새로고침하여 정합성을 보장합니다.

## Deploy (Vercel)

- Import the repo in Vercel, Framework: Vite, Build Command: `npm run build`, Output: `dist`.
- Add environment variables in Vercel Project Settings → Environment Variables:
  `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optional `VITE_STYLE_PROVIDER`.

## Troubleshooting

- `POST http://localhost:8000/api/auth/register/ net::ERR_CONNECTION_REFUSED`
  - 이 저장소는 별도 백엔드 없이 Supabase Auth를 사용합니다. 위 에러는 프론트가 `localhost:8000`의 커스텀 백엔드로 가입 요청을 보내려 할 때(서버 미동작) 발생합니다.
  - 해결 옵션:
    1) 백엔드가 실제로 있다면 로컬 서버를 실행하세요(예: Django `python manage.py runserver 8000`, FastAPI `uvicorn app:app --reload --port 8000`, Node `npm run dev`).
    2) 프론트엔드에서 가입/로그인 로직을 Supabase로 전환하세요: `supabase.auth.signUp`, `supabase.auth.signInWithPassword`.
    3) `API_BASE_URL` 같은 환경변수가 있다면 올바른 주소로 수정하거나 제거하세요.

- `POST https://<project-ref>.supabase.co/auth/v1/resend 429 (Too Many Requests)`
  - 원인: 확인 이메일 재전송 요청이 짧은 시간에 여러 번 호출됨(레이트 리밋).
  - 해결: UI에서 재전송 버튼에 쿨다운을 적용(예: 60초). 이 저장소의 AuthModal은 재전송 성공/오류 시 60초 쿨다운을 걸어 둡니다.
  - 개발 시에는 Email Confirm을 일시적으로 Off 하거나 신규 테스트 이메일을 사용해 주세요.

- `POST https://<project-ref>.supabase.co/auth/v1/token?grant_type=password 400 (Bad Request)`
  - 원인: 잘못된 자격 증명(이메일/비밀번호), 이메일 미확인, Email Provider 정책 문제 등.
  - 해결:
    1) 이메일/비밀번호 재확인(비밀번호 6자 이상)
    2) 이메일 확인 필요 시 받은편지함/스팸함 확인 후 링크 클릭, 필요 시 "확인 이메일 재전송" 사용
    3) Supabase Auth → Providers → Email에서 Allow signups가 켜져 있는지 확인

- `GET https://<project-ref>.supabase.co/auth/v1/health 401 (Unauthorized)`
  - 원인: Supabase는 대부분의 엔드포인트에서 익명 키(apikey) 헤더가 필요합니다.
  - 해결: 요청 헤더에 `apikey: <VITE_SUPABASE_ANON_KEY>`, `Authorization: Bearer <VITE_SUPABASE_ANON_KEY>` 포함.
  - 참고: 이 저장소의 “연결 점검” 버튼은 위 헤더를 자동으로 포함합니다.

- Gemini 429 RESOURCE_EXHAUSTED / Quota exceeded
  - 원인: 무료 티어 한도 초과 또는 속도 제한. 메시지에 대기 시간(retryDelay)이 포함됩니다.
  - 해결 옵션:
    1) 유료 플랜/쿼터 상향 또는 새 키 사용
    2) `.env.local`: `VITE_STYLE_PROVIDER=nanobanana`로 임시 전환(스텁)
    3) `.env.local`: `VITE_FALLBACK_ON_QUOTA=true`(기본) — 쿼터 초과 시 자동으로 나노바나나로 폴백
  - 참고: 폴백 시 결과 이미지가 비어 있을 수 있으며, UI는 입력 이미지/플레이스홀더로 대체 표시됩니다.

## Supabase Auth 마이그레이션(호환 레이어)

- 추가된 파일(백엔드 없이 동작):
  - `apiService.ts`: 기존 `/api/auth/register|login|logout` 호출을 Supabase Auth로 매핑
  - `AuthContext.tsx`: 세션 상태 관리, `register/login/logout` 제공
  - `SignUpForm.tsx`, `SignInForm.tsx`: 폼 예시 컴포넌트
- 기존 코드가 `apiService.ts`의 `register/login/logout` 또는 `new ApiClient().post(...)`를 호출해도, 이제 Supabase로 동작합니다.
- `.env.local`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 없으면 스텁으로 동작(크래시 방지)하지만, 인증 기능은 비활성화됩니다.
