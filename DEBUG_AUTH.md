# 🔧 Supabase 로그인 400 에러 디버깅 가이드

## 🚨 현재 발생 중인 에러
```
POST https://fazvondzbpdcoaqzpkaq.supabase.co/auth/v1/token?grant_type=password 400 (Bad Request)
```

## 🔍 단계별 해결 방법

### 1단계: 기본 검증 (즉시 확인)

#### A. 환경변수 확인
```bash
# .env.local 파일 확인
VITE_SUPABASE_URL=https://fazvondzbpdcoaqzpkaq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### B. 입력 데이터 검증
- ✅ 이메일 형식: 유효한 이메일인가?
- ✅ 비밀번호: 6자 이상인가?
- ✅ 공백 없음: 앞뒤 공백이 있는가?

### 2단계: Supabase 프로젝트 설정 확인

#### A. Authentication → Providers → Email
```
✅ Email Provider: Enabled
✅ Allow signups: Enabled (회원가입을 허용하려면)
✅ Confirm email: 정책에 맞게 설정 (On/Off 선택)
```

#### B. Authentication → URL Configuration
```
✅ Site URL: http://localhost:5173 (로컬 테스트)
✅ Additional Redirect URLs에 현재 도메인 포함
```

### 3단계: 실제 테스트 시나리오

#### A. 새로운 계정으로 테스트
```
1. 새 이메일로 회원가입 시도
2. 이메일 확인 (Confirm email이 On인 경우)
3. 해당 계정으로 로그인 시도
```

#### B. 기존 계정 상태 확인
```
Supabase Dashboard → Authentication → Users
- 해당 이메일이 등록되어 있는가?
- Email confirmed 상태인가?
- Last sign in 정보는?
```

## 🛠 코드 레벨 디버깅

### AuthModal.tsx 디버그 추가
```typescript
// 로그인 함수에 디버그 로그 추가
const handleEmailLogin = async () => {
  console.log('로그인 시도:', { email, password: '***' });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), // 공백 제거
      password: password.trim()
    });

    console.log('로그인 응답:', { data, error });

    if (error) {
      console.error('로그인 에러 상세:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
    }
  } catch (err) {
    console.error('로그인 예외:', err);
  }
};
```

### Network Tab으로 요청 확인
```
개발자 도구 → Network Tab → 로그인 시도
1. Request Headers 확인
2. Request Payload 확인
3. Response 내용 확인
```

## 🎯 일반적인 해결 방법

### Case 1: 이메일 미확인
```typescript
// 확인 이메일 재발송
await supabase.auth.resend({
  type: 'signup',
  email: userEmail
});
```

### Case 2: 비밀번호 초기화
```typescript
// 비밀번호 재설정
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: window.location.origin
});
```

### Case 3: 계정 재생성
```
1. Supabase Dashboard에서 기존 계정 삭제
2. 새로 회원가입
3. 이메일 확인 (필요시)
4. 로그인 재시도
```

## 🔄 빠른 해결 체크리스트

### 즉시 시도해볼 것들 (5분)
- [ ] 새로운 이메일로 회원가입 → 로그인 테스트
- [ ] 기존 계정이면 비밀번호 재설정 링크 사용
- [ ] 브라우저 캐시 삭제 후 재시도
- [ ] 다른 브라우저 (시크릿 모드)에서 테스트

### Supabase 설정 확인 (5분)
- [ ] Email Provider 활성화 상태
- [ ] Allow signups 설정 확인
- [ ] URL Configuration 확인
- [ ] Users 테이블에서 계정 상태 확인

### 코드 디버그 (10분)
- [ ] Console.log로 요청 데이터 확인
- [ ] Network Tab에서 실제 요청/응답 확인
- [ ] 환경변수 올바른 로드 확인

## 🚨 긴급 우회 방법

### 임시 테스트 계정 생성
```sql
-- Supabase SQL Editor에서 직접 실행
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

### Confirm Email 임시 비활성화
```
Supabase → Authentication → Providers → Email
→ Confirm email: OFF (임시로)
→ 테스트 완료 후 다시 활성화
```

## 📊 에러 패턴별 해결 매트릭스

| 에러 메시지 | 가능한 원인 | 해결책 |
|-------------|-------------|--------|
| Invalid credentials | 잘못된 이메일/비밀번호 | 정보 확인, 비밀번호 재설정 |
| Email not confirmed | 이메일 미확인 | 확인 이메일 재발송 |
| Signup disabled | Allow signups OFF | Supabase 설정에서 활성화 |
| Invalid email | 이메일 형식 오류 | 올바른 이메일 형식 사용 |

## 💡 예방 방법

### 사용자 친화적 에러 메시지
```typescript
const getErrorMessage = (error: any) => {
  switch (error.message) {
    case 'Invalid credentials':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'Email not confirmed':
      return '이메일 인증이 필요합니다. 받은편지함을 확인해주세요.';
    case 'Signup disabled':
      return '현재 회원가입이 비활성화되어 있습니다.';
    default:
      return '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
};
```

### 개발 환경 안정화
```typescript
// .env.local 검증
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error('VITE_SUPABASE_URL이 설정되지 않았습니다.');
}
```

이 가이드대로 단계별로 확인하시면 400 에러를 해결할 수 있을 것입니다.