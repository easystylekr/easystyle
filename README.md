# EasyStyle - AI-Powered Personal Stylist

> "Style Made Simple" - AI가 당신의 완벽한 스타일을 찾아드립니다.

## 🌟 프로젝트 소개

EasyStyle은 AI 기술을 활용한 개인 맞춤형 스타일링 서비스입니다. 사용자가 업로드한 사진과 스타일 요청을 바탕으로 AI가 최적의 패션 스타일을 생성하고, 실제 쇼핑몰에서 구매할 수 있는 상품을 추천합니다.

## ✨ 주요 기능

### 🎨 AI 스타일 생성
- **사진 업로드**: 사용자 사진을 업로드하여 AI가 분석
- **스타일 요청**: 원하는 스타일을 텍스트로 입력
- **AI 생성**: Google Gemini API를 사용한 스타일 이미지 생성
- **스타일 설명**: 생성된 스타일에 대한 상세 설명 제공

### 🛍️ 상품 추천 및 구매
- **실시간 상품 검색**: AI가 생성한 스타일에 맞는 상품 자동 검색
- **다양한 쇼핑몰 연동**: Zara, H&M, Uniqlo, COS 등 주요 브랜드
- **상세 상품 정보**: 가격, 사이즈, 색상, 재질 등 완전한 상품 정보
- **위시리스트**: 관심 상품 저장 및 관리

### 📱 사용자 경험
- **PWA 지원**: 모바일 앱처럼 설치 가능
- **반응형 디자인**: 모든 디바이스에서 최적화된 경험
- **오프라인 지원**: 네트워크 없이도 기본 기능 사용 가능
- **실시간 업데이트**: 상품 정보 및 가격 실시간 동기화

## 🏗️ 기술 스택

### Frontend
- **React 19.1.1** - 사용자 인터페이스
- **TypeScript** - 타입 안전성
- **Vite 6.2.0** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **PWA** - 프로그레시브 웹 앱

### Backend
- **Django 5.2.6** - 웹 프레임워크
- **Django REST Framework 3.16.1** - API 개발
- **PostgreSQL** - 데이터베이스 (프로덕션)
- **SQLite** - 개발용 데이터베이스

### AI & Services
- **Google Gemini API** - AI 스타일 생성
- **이미지 최적화** - 자동 압축 및 WebP 지원
- **RESTful API** - 프론트엔드-백엔드 통신

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/easystyle.git
cd easystyle
```

### 2. 프론트엔드 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
# http://localhost:5173
```

### 3. 백엔드 설정
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv easystyle_env
source easystyle_env/bin/activate  # Windows: easystyle_env\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 데이터베이스 마이그레이션
python manage.py migrate

# 샘플 데이터 생성
python create_sample_products.py

# 개발 서버 실행
python manage.py runserver 8000
# http://localhost:8000
```

### 4. 환경 변수 설정
```bash
# backend/.env 파일 생성
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
GEMINI_API_KEY=your-gemini-api-key
```

## 📁 프로젝트 구조

```
easystyle/
├── frontend/                 # React 프론트엔드
│   ├── components/          # React 컴포넌트
│   ├── services/           # API 서비스
│   ├── utils/              # 유틸리티 함수
│   └── types.ts            # TypeScript 타입
├── backend/                 # Django 백엔드
│   ├── authentication/     # 사용자 인증
│   ├── products/           # 상품 관리
│   ├── ai_services/        # AI 서비스
│   └── easystyle_backend/  # Django 설정
├── public/                 # 정적 파일
└── docs/                   # 문서
```

## 🔧 API 문서

### 인증 API
- `POST /api/auth/register/` - 회원가입
- `POST /api/auth/login/` - 로그인
- `GET /api/auth/profile/` - 프로필 조회

### 상품 API
- `GET /api/products/` - 상품 목록
- `GET /api/products/{uuid}/` - 상품 상세
- `POST /api/products/search/` - 상품 검색
- `GET /api/products/wishlist/` - 위시리스트

### AI API
- `POST /api/ai/generate-style/` - 스타일 생성
- `GET /api/ai/style-history/` - 스타일 히스토리

## 🎯 로드맵

### Phase 1: MVP (완료) ✅
- [x] 기본 UI/UX 구현
- [x] AI 스타일 생성
- [x] 상품 추천 시스템
- [x] 사용자 인증
- [x] PWA 기능

### Phase 2: 고도화 (진행 중) 🔄
- [ ] 실제 쇼핑몰 API 연동
- [ ] Nano Banana AI 통합
- [ ] 실시간 상품 데이터 동기화
- [ ] 고급 추천 알고리즘

### Phase 3: 확장 (계획) 📋
- [ ] 모바일 앱 개발
- [ ] 소셜 기능
- [ ] 결제 시스템
- [ ] 다국어 지원

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 연락처

- **개발자**: Claude Code SuperClaude Framework
- **이메일**: contact@easystyle.com
- **프로젝트 링크**: [https://github.com/your-username/easystyle](https://github.com/your-username/easystyle)

## 🙏 감사의 말

- Google Gemini API
- Django Community
- React Community
- 모든 오픈소스 기여자들

---

**EasyStyle으로 당신만의 완벽한 스타일을 찾아보세요!** ✨# easystyle
