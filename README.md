# 자취실록

세입자가 입주·거주·퇴거 시점의 방 상태를 위변조할 수 없는 기록으로 남기고, 집주인 확인과 퇴거 비교 리포트로 보증금 분쟁을 줄이는 모바일 서비스입니다.

## 폴더 구성

| 경로 | 내용 |
|---|---|
| `app/` | Expo(React Native) 앱. 실행 방법은 [app/README.md](app/README.md) |
| `design-refs/` | Figma "v2 · 자유 탐색 구조" 화면 캡처 (앱 구현 기준) |
| `assets/v2/` | 마스코트 포즈, 활용 컷, 앱 아이콘 |
| `logo/` | 자취실록 로고 PNG (기본, 어두운 배경용, 간단형) |
| `bangjeung.html` | 초기 웹 클릭 프로토타입 (이전 브랜드 '방증' 기준) |
| `assets/*.png`, `assets/*.jpg` | 이전 브랜드 '방증' 마스코트 에셋 |

## 앱 빠른 실행

```bash
cd app
npm install
npx expo start
```

휴대폰의 Expo Go 앱으로 터미널에 뜨는 QR 코드를 찍으면 실행됩니다.
