# CODEX: Development Log

This file tracks development progress in near real time. Add an entry for every meaningful change (feature, refactor, infra, docs), referencing PRD/Plan/Checklist items. Latest entries appear first.

## How To Update
- One entry per change; keep it concise and factual.
- Reference: PRD.md section(s), DEVELOPMENT_PLAN.md phase/week, DEVELOPMENT_CHECKLIST.md items.
- Include scope, files, and any env/ops notes.

### Entry Template
```
## [YYYY-MM-DD HH:MM UTC] Title
- Scope: short description
- Links: PRD §x.x; Plan Week N; Checklist item(s)
- Files: paths changed
- Notes: deployment/env, follow-ups, blockers
```

---

## [2025-09-25 01:15 UTC] Supabase auth modal + session wiring
- Scope: Email/Password 로그인·회원가입 모달 추가, 세션 표시/로그아웃, 초기 세션 구독
- Links: PRD §1.1 Auth; Plan Week 3; Checklist: "프론트엔드 인증 시스템"
- Files: `components/AuthModal.tsx`, `services/supabaseClient.ts`, `App.tsx`, `package.json`
- Notes: Requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Social OAuth pending.

## [2025-09-25 01:10 UTC] Style provider abstraction + 나노바나나모델 스텁
- Scope: Provider-agnostic facade with env switch; placeholder implementation for 나노바나나모델
- Links: PRD §2; Plan Week 5 prep; Checklist: "나노바나나 Gemini API 최적화"
- Files: `services/styleProvider.ts`, `services/nanoBananaModel.ts`, `App.tsx`
- Notes: Switch via `VITE_STYLE_PROVIDER=nanobanana`. Awaiting API spec to replace stubs.

## [2025-09-25 01:05 UTC] Docs: README env + Vercel deploy
- Scope: Added Supabase env, provider toggle, Vercel settings
- Links: Plan Week 4; Checklist: "Vercel + Supabase 통합"
- Files: `README.md`
- Notes: Vercel env: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_STYLE_PROVIDER`.

## [2025-09-25 01:00 UTC] Contributor guide (AGENTS.md)
- Scope: Project structure, scripts, style, testing, PRs, security
- Links: Checklist: "문서화"
- Files: `AGENTS.md`
- Notes: Keep 200–400 words; aligns with current repo tooling.

---

## [2025-09-25 01:25 UTC] OAuth buttons, profiles upsert, schema SQL, PR template
- Scope: Added Google/GitHub OAuth in AuthModal; upsert profile on session; Supabase schema SQL for `profiles`, `style_requests`, `purchase_requests` with RLS; `.env.example`; PR template requiring CODEX updates
- Links: PRD §1.1 Auth; Plan Week 1-3; Checklist: Auth + DB + Docs
- Files: `components/AuthModal.tsx`, `services/profile.ts`, `supabase/schema.sql`, `.env.example`, `.github/PULL_REQUEST_TEMPLATE.md`, `App.tsx`
- Notes: Apply SQL via Supabase SQL Editor. Configure OAuth providers in Supabase (Redirect URL from project). 

## [2025-09-25 04:15 UTC] 상품검색 Agent 시스템 개발 계획 수립
- Scope: AI 스타일링 결과 → 실시간 상품 검색 → phillip 관리자 검토 → 구매 대행의 핵심 워크플로우 완성을 위한 3단계 MVP 개발 계획 수립
- Links: PRD §3(구매 대행); Plan Phase 3; 새 문서: `PRODUCT_SEARCH_PLAN.md`, `AGENT_IMPLEMENTATION.md`, `MVP_AGENT_GUIDE.md`
- Files: `PRODUCT_SEARCH_PLAN.md` (전체 아키텍처), `AGENT_IMPLEMENTATION.md` (상세 구현), `MVP_AGENT_GUIDE.md` (Vercel MVP 구축)
- Notes: 3주 로드맵 - Week 1: 기본 검색(fetch+cheerio), Week 2: AI 파싱 추가, Week 3: 완전 자동화. Vercel Serverless Functions + React Admin UI 구조로 현재 프로젝트에 바로 통합 가능

## Upcoming
- **상품검색 Agent MVP 구현** (3주): Week 1 기본 검색 API + Admin UI → Week 2 AI 상품 파싱 → Week 3 재고 확인 자동화
- DB schema migrations: `profiles`, `style_requests`, `purchase_requests` + RLS (Plan Week 1-2; PRD §1, §3).
- Email Auth UX 추가 개선(온보딩/프로필) — OAuth는 MVP 범위에서 제외
- Replace 나노바나나모델 stubs with real API calls once spec is available (Plan Week 5).
- **phillip 관리자 워크플로우**: 검색 결과 검토 → 구매 승인 → 대행 주문 처리 시스템 구축

## [2025-09-25 04:05 UTC] 회원가입 안정화: emailRedirectTo 및 오류 메시지 보강
- Scope: `signUp` 호출에 `options.emailRedirectTo` 추가, 빈약한 에러 메시지를 한글 가이드로 보강
- Links: PRD §1.1; Plan Week 3; README Auth UX
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: Supabase Auth URL 설정의 Redirect 목록에 현재 도메인이 있어야 이메일 확인 링크가 정상 동작

## [2025-09-25 03:55 UTC] Supabase OAuth 400 오류 해결 가이드 추가
- Scope: OAuth 400(redirect 미허용/Provider 미설정) 트러블슈팅을 README에 문서화
- Links: PRD §1.1, Plan Week 3, README Troubleshooting
- Files: `README.md`
- Notes: Site URL/Additional Redirect URLs, Provider 콘솔의 Authorized Redirect URIs/Origins 설정 체크리스트 포함

## [2025-09-25 03:40 UTC] 로그인/회원가입 완성(검증·재전송·재설정)
- Scope: AuthModal에 입력 검증(이메일 형식/비밀번호 길이), OAuth redirectTo 적용, 확인 이메일 재전송/비밀번호 재설정 추가
- Links: PRD §1.1; Plan Week 3; README Auth UX
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: Supabase env 미설정 시 스텁으로 안내 메시지 반환. 실제 동작엔 `VITE_SUPABASE_URL/ANON_KEY` 필수.

## [2025-09-25 03:22 UTC] 내 활동(스타일/구매 기록) 모달 추가
- Scope: 사용자의 스타일/구매 요청 기록을 Supabase에서 조회하는 모달 구현 및 홈에서 접근 버튼 추가
- Links: PRD §1, §3; Plan Week 1-2 DB, UX 개선
- Files: `components/ActivityModal.tsx`, `services/db.ts`, `services/supabaseClient.ts`(스텁 select 개선), `App.tsx`
- Notes: 미인증/미설정 환경에서는 빈 결과 및 경고 처리. Prod에서는 RLS로 사용자 소유 데이터만 조회.

## [2025-09-25 03:05 UTC] Supabase Auth 호환 레이어 추가
- Scope: 백엔드 호출 의존 코드 호환을 위해 다음 파일 추가 — `apiService.ts`(register/login/logout → Supabase 매핑), `AuthContext.tsx`(세션 관리), `SignUpForm.tsx`/`SignInForm.tsx`(폼 예시)
- Links: PRD §1(인증), Plan Week 3, README Supabase Auth 마이그레이션 섹션
- Files: `apiService.ts`, `AuthContext.tsx`, `SignUpForm.tsx`, `SignInForm.tsx`, `README.md`
- Notes: `.env.local`에 Supabase 설정이 없으면 스텁으로 동작(크래시 방지). 기존 `/api/auth/*` 호출을 Supabase로 전환.

## [2025-09-25 02:55 UTC] `ERR_CONNECTION_REFUSED` (localhost:8000) 트러블슈팅 가이드
- Scope: 사용자가 보고한 가입 API 호출 실패 현상 정리 및 해결 옵션 문서화
- Links: PRD §1(인증), Plan Week 3(인증), README Troubleshooting
- Files: `README.md` (Troubleshooting 섹션 추가)
- Notes: 본 저장소는 Supabase Auth를 사용하며 별도 백엔드가 필요 없음. 커스텀 백엔드 사용 시 서버 기동 또는 프론트 로직을 Supabase로 전환 필요.

## [2025-09-25 02:42 UTC] SNS 가입 제공자: 구글·네이버·카카오 지원
- Scope: AuthModal에 Naver 버튼 추가, OAuth union 타입에 `naver` 포함, README에 Naver 설정 가이드 추가
- Links: PRD §1.1(소셜 로그인); Plan Week 3; Checklist Auth
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: Supabase Providers에서 Google/Naver/Kakao 활성화 및 각 개발자 콘솔에서 앱/키 발급 필요. Redirect URL 등록 필수.

## [2025-09-25 02:30 UTC] OAuth 제공자 Kakao로 교체 및 회원가입 UX 개선
- Scope: AuthModal의 GitHub 버튼 → Kakao로 교체; 회원가입 시 이메일 확인 안내를 표시하도록 UX 개선
- Links: PRD §1.1(인증); Plan Week 3; Checklist Auth
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: Supabase 대시보드에서 Kakao Provider 활성화 및 Redirect URL 설정 필요. 이메일 확인이 필요한 경우 모달에서 안내 메시지 노출.

## [2025-09-25 02:20 UTC] Supabase 미설정 시 안전 스텁 제공
- Scope: `services/supabaseClient.ts`에서 환경변수 미설정 시 no-op 스텁을 반환하도록 변경 → 앱 크래시 방지
- Links: PRD §1(인증), Plan Week 3(인증), Checklist 안정성
- Files: `services/supabaseClient.ts`
- Notes: 미설정 환경에서도 UI 확인 가능. 실제 인증/DB 기능은 작동하지 않고 경고/에러 메시지 반환.

## [2025-09-25 02:12 UTC] 로컬 실행 오류(vite not found) 트러블슈팅 가이드
- Scope: `npm run dev` 시 `vite: command not found` 해결 절차 정리
- Links: Plan Phase 1 로컬 개발 환경; Checklist 문서화
- Steps:
  1) 의존성 설치: `npm install`
  2) Node 버전 확인: `node -v` (권장: Node 18 이상, 20 LTS)
     - 필요 시 nvm으로 설치: `nvm install --lts && nvm use --lts`
  3) 재시도: `npm run dev`
  4) 실패 시: `rm -rf node_modules package-lock.json && npm install`
  5) 환경변수 점검: `.env.local` 존재 및 값 확인
- Notes: npm 스크립트는 자동으로 `node_modules/.bin`을 PATH에 추가하므로 Vite 글로벌 설치는 불필요

## [2025-09-25 02:05 UTC] 로컬 개발/테스트 가이드 정리
- Scope: 로컬 실행·테스트 절차 및 선택지 문서화(의존성/환경변수/체크포인트)
- Links: PRD §1, §2; Plan Phase 1-2; Checklist 문서화
- Files: (guide only) — 실행은 아래 절차 참조
- Notes:
  - 1) Node 설치 후 `npm install`
  - 2) `.env.local` 생성: `cp .env.example .env.local` 후 값 설정
    - 기본: `GEMINI_API_KEY=<키>` (Gemini 사용 시)
    - Supabase(선택): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
    - 엔진 선택: `VITE_STYLE_PROVIDER=gemini | nanobanana`
  - 3) (선택) Supabase SQL 적용: `supabase/schema.sql`
  - 4) 실행: `npm run dev` → http://localhost:5173
  - 5) 테스트 시나리오
    - Auth: 이메일/패스워드 또는 Google/GitHub(OAuth 리다이렉트 설정 필요)
    - 스타일 생성: gemini(실 호출) 또는 nanobanana(스텁, 이미지 폴백 동작 확인)
    - 구매 요청: 로그인 상태에서 요청 → Supabase `purchase_requests`에 기록

## [2025-09-25 01:52 UTC] 결과 이미지/카드 안전한 폴백 처리
- Scope: 스타일 이미지가 비어있는 경우 입력 이미지나 플레이스홀더를 사용; ProductCard 폴백에도 동일 URL 전달
- Links: PRD §2(스타일링 UX 품질); Checklist 성능/품질
- Files: `App.tsx`
- Notes: `VITE_STYLE_PROVIDER=nanobanana` 사용 시 스텁으로 인해 이미지가 빈 경우 UX 깨짐 방지

## [2025-09-25 01:45 UTC] 환경 변수 VITE_STYLE_PROVIDER 설정
- Scope: 스타일 엔진 선택용 환경 변수 설정 완료(사용자 설정). `services/styleProvider.ts`에서 값에 따라 `gemini`/`nanobanana`로 분기
- Links: PRD §2(스타일링 엔진), Plan Week 5 준비, Checklist 문서화
- Files: `.env.local`(로컬), Vercel Project Settings → Environment Variables(배포 환경)
- Notes: 미설정 시 기본 `gemini`. 값은 클라이언트에 주입(`import.meta.env.VITE_STYLE_PROVIDER`). `recordStyleRequest`가 현재 프로바이더를 DB에 기록함.

## [2025-09-25 01:35 UTC] Persist style/purchase requests to Supabase
- Scope: Added DB service to log style generations and purchase intents; wired into App flows
- Links: PRD §1(인증)+§3(구매 대행); Plan Week 1-2 DB, Week 3 Auth
- Files: `services/db.ts`, `App.tsx`
- Notes: Requires `supabase/schema.sql` applied. RLS enforces user ownership; unauthenticated users cannot persist.
## [2025-09-25 04:20 UTC] MVP 정합화: SNS 로그인 제거(이메일 가입만)

## [2025-09-25 04:28 UTC] 회원가입 진입 UX 개선(모달 초기 탭 연동)
- Scope: 홈의 "회원가입" 버튼 클릭 시 AuthModal이 즉시 가입 탭으로 열리도록 `defaultMode` prop 추가 및 App 연동
- Links: PRD §1.1; Plan Week 3; UX 개선
- Files: `components/AuthModal.tsx`, `App.tsx`
- Notes: 로그인/회원가입 버튼이 각각 해당 탭으로 모달을 오픈하여 혼동 최소화
- Scope: AuthModal에서 SNS 버튼/로직 제거, README를 이메일 가입만 사용하도록 정리
- Links: PRD §1.1(MVP 범위), Plan Week 3, 제품 전략
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: Email Provider 활성화 및 URL 설정만 필요. OAuth 설정/문서는 MVP에서 제외.
## [2025-09-25 04:45 UTC] 확인 이메일 재전송 429 대응(쿨다운 적용)
- Scope: AuthModal에 재전송 쿨다운(60초) 타이머 추가, 429시 사용자 안내 메시지 개선; README 트러블슈팅에 429 항목 추가
- Links: PRD §1.1; Plan Week 3; 안정성/UX 개선
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: 잦은 재전송 시 Supabase가 429 반환. 쿨다운으로 UX 보호 및 불필요한 호출 방지.
## [2025-09-25 05:00 UTC] 로그인 400 오류 메시지 보강 및 가이드
- Scope: 로그인 실패(400) 시 잘못된 자격 증명/이메일 미확인/정책 이슈를 구분해 한글 안내; README 트러블슈팅에 400 항목 추가
- Links: PRD §1.1; Plan Week 3; 안정성/UX 개선
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: 사용자가 원인 파악 및 자가 해결을 빠르게 할 수 있도록 메시지 명확화
## [2025-09-25 05:15 UTC] Gemini 쿼터 초과(429) 자동 폴백 구현
- Scope: `services/styleProvider.ts`에 쿼터 오류 감지(429/RESOURCE_EXHAUSTED) 시 나노바나나로 폴백 로직 추가; `.env.example`/README에 `VITE_FALLBACK_ON_QUOTA` 문서화
- Links: PRD §2(스타일 생성), Plan Week 5 준비, 운영 안정성
- Files: `services/styleProvider.ts`, `.env.example`, `README.md`
- Notes: 폴백 활성 시 사용자는 최소한 텍스트 설명과 UI 폴백 이미지를 확인 가능. 유료 플랜/쿼터 상향 시 원복 권장.
## [2025-09-25 05:25 UTC] Gemini API 키 교체 및 재검증 절차
- Scope: 사용자 요청에 따라 `GEMINI_API_KEY` 교체 확인 및 재검증 가이드 공유
- Links: PRD §2; README Troubleshooting; vite.config.ts 주입 방식
- Steps:
  1) 로컬: `.env.local`에 `GEMINI_API_KEY=<새 키>` 저장 후 개발 서버 재시작(`Ctrl+C` → `npm run dev`)
  2) 배포: Vercel Project Settings → Environment Variables에서 `GEMINI_API_KEY` 갱신 후 재배포
  3) 강제 Gemini 사용 확인: `.env.local`에 `VITE_STYLE_PROVIDER=gemini`, `VITE_FALLBACK_ON_QUOTA=false`로 설정 후 재시작
  4) 확인: 콘솔/네트워크에서 429 없이 성공 응답 여부 확인(간단 프롬프트/작은 이미지 권장)
- Notes: `vite.config.ts`가 `GEMINI_API_KEY`를 `process.env.API_KEY`로 주입합니다. 키 교체 후 서버 재시작이 필요합니다.
## [2025-09-25 05:35 UTC] Auth 요청 타임아웃/예외대응으로 무한 로딩 방지
- Scope: 로그인/회원가입에 15초 타임아웃 및 try/catch/finally 적용해 오류/지연 시 버튼 상태 복구 및 안내
- Links: PRD §1.1; Plan Week 3; 안정성/UX 개선
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: 네트워크 지연/일시 장애에도 무한 "처리 중" 상태에 머무르지 않도록 방어 처리
## [2025-09-25 05:50 UTC] Auth 디버그 모드/재시도 버튼/오프라인 안내 추가
- Scope: `VITE_AUTH_DEBUG` 환경변수로 로그인/가입 처리 시간 로그, 실패 시 "다시 시도" 버튼, 오프라인 상태 안내 추가
- Links: PRD §1.1; Plan Week 3; 디버깅/UX 개선
- Files: `components/AuthModal.tsx`, `.env.example`, `README.md`
- Notes: 네트워크 지연 원인 파악에 도움. 디버그 모드는 개발 환경에서만 사용 권장.
## [2025-09-25 06:05 UTC] Auth 연결 점검 버튼 추가
- Scope: AuthModal에 Supabase `/auth/v1/health`를 5초 타임아웃으로 ping하는 "연결 점검" 버튼 추가
- Links: PRD §1.1; Plan Week 3; 안정성/디버깅
- Files: `components/AuthModal.tsx`
- Notes: 정상 시 상태/지연시간 표기, 실패 시 네트워크/방화벽/차단 설정 안내. DEBUG 모드 또는 오류 발생 시 노출.
## [2025-09-25 06:12 UTC] Supabase health 401 대응(헤더 추가)
- Scope: 연결 점검 시 `apikey`/`Authorization` 헤더(익명 키) 포함하도록 수정; README 트러블슈팅에 401 항목 추가
- Links: PRD §1.1; Plan Week 3; 안정성/디버깅
- Files: `components/AuthModal.tsx`, `README.md`
- Notes: Supabase 클라우드에서 health 포함 대부분 요청은 apikey 필요. 잘못된 키면 401 반환.
## [2025-09-25 06:20 UTC] 로그아웃 안정화(스토리지 정리 + 즉시 UI 반영)
- Scope: signOut 호출 후 로컬 스토리지 내 supabase 세션 토큰 키를 방어적으로 삭제하고, `userEmail`을 즉시 null로 설정해 UI에 반영
- Links: PRD §1.1; Plan Week 3; 안정성/UX 개선
- Files: `App.tsx`
- Notes: 네트워크/환경 이슈로 signOut 이벤트 수신이 지연되어도 사용자에게서는 즉시 로그아웃으로 보이도록 처리
- 추가 보강: signOut 후 사용자 세션이 여전히 존재하면 `scope: 'local'`로 재시도하고 스토리지 재정리(250ms 지연) 처리
## [2025-09-25 06:30 UTC] 로그인 타임아웃 대응: REST 폴백 + 타임아웃 설정화
- Scope: `signInWithPassword` 타임아웃 시 `/auth/v1/token?grant_type=password` REST 직접 호출로 재시도하고, 성공 시 `setSession`으로 세션 주입. `VITE_AUTH_TIMEOUT_MS`로 타임아웃 조정 가능.
- Links: PRD §1.1; Plan Week 3; 안정성/UX 개선
- Files: `components/AuthModal.tsx`, `.env.example`, `README.md`
- Notes: 네트워크 지연/차단 환경에서도 원인 메시지를 더 분명히 제공하며, 가능할 경우 로그인 절차를 완료.
## [2025-09-25 06:40 UTC] Tailwind CDN 제거 및 PostCSS 통합
- Scope: CDN 스크립트 제거, PostCSS + Tailwind 설정 추가(`tailwind.config.ts`, `postcss.config.js`), `index.css`에 @tailwind 지시자, `index.tsx`에서 import, README 가이드 작성
- Links: 빌드 최적화/프로덕션 권장 구성
- Files: `index.html`, `index.tsx`, `index.css`, `tailwind.config.ts`, `postcss.config.js`, `package.json`, `README.md`
- Notes: 사용자는 `npm install` 후 빌드/배포하면 됩니다. CDN 경고 제거.
- Hotfix: 사용자의 로컬에서 devDeps 미설치로 스타일 깨짐 보고 → `index.html`에 CDN을 개발 한정 폴백으로 재추가. 배포 전 제거 안내를 README에 명시.
## [2025-09-25 06:55 UTC] 세션 이벤트 기반 모달 자동 닫힘
- Scope: AuthModal에서 `onAuthStateChange`를 구독해 세션이 생성되면 자동으로 로딩 해제/오류 초기화 후 모달을 닫도록 추가
- Links: PRD §1.1; Plan Week 3; UX 안정화
- Files: `components/AuthModal.tsx`
- Notes: 라이브러리 호출 타임아웃이 나도 백그라운드에서 로그인이 성공한 경우 모달이 열려 있는 문제를 해결
## [2025-09-25 07:05 UTC] 로그아웃 보강: local→global 순차 시도 + 강제 새로고침
- Scope: 로그아웃 버튼에 진행 상태 표기; local scope → global scope 순서로 signOut 재시도 후, 세션 잔존 시 페이지 리로드로 정합성 보장
- Links: PRD §1.1; Plan Week 3; 안정성/UX 개선
- Files: `App.tsx`, `README.md`
- Notes: 멀티 탭/세션 동기화 지연이나 환경 특이 케이스에서도 일관된 로그아웃 경험 제공
