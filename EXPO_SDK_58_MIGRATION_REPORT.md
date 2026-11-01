# 자취실록 Expo SDK 58 마이그레이션 보고서

작성일: 2026-11-01 (Asia/Seoul)

## 1. 결과와 Git 상태

Expo SDK 58 설치와 ERESOLVE 해결을 완료했다. `expo install --check`, Expo Doctor 20/20, TypeScript, ESLint, 전체 npm 의존성 트리 검사, Android Hermes production 번들, Android 개발 번들 HTTP 응답, 웹 export가 통과했다. **Android 휴대폰의 Expo Go 58에서 앱을 직접 실행한 결과는 아직 없다.**

작업 시작 HEAD는 `a06273d355f8c8d2e478c02a3aed954b2ef615eb`, 브랜치는 main이었다. 사용자가 이미 변경한 package.json/package-lock.json을 보존하며 `chore/expo-sdk-58` 브랜치를 새로 만들었다. commit/push/PR/merge는 수행하지 않았다. Supabase 스키마·원격 설정·Edge Function·환경변수 값은 변경하지 않았다.

공식 expo-upgrade skill은 로컬에 설치되어 있지 않아 Expo 공식 저장소의 SKILL.md를 읽고 업그레이드 순서·breaking change·CNG 지침을 적용했다. 사용자의 최소 변경 요구에 따라 React Compiler 활성화, UI framework 교체, 임의 리팩터링은 하지 않았다.

## 2. 마이그레이션 전후 버전

이전 main은 SDK57이었다. 작업 시작 시 manifest에는 SDK58 권장값이 대부분 들어 있었으나 설치판/lock은 expo 본체58 + 나머지57이 혼재했다. 아래 이전 값은 main 선언 또는 기존 설치판 기준이며 최종 값은 실제 설치된 버전이다.

| 패키지 | 이전 SDK57 계열 | 최종 설치 |
|---|---|---|
| expo | main ~57.0.31, 작업 시작 설치판58.0.22 | 58.0.22 |
| @expo/metro-runtime | 57.0.17 | 58.0.16 |
| expo-router | 57.0.29 | 58.0.29 |
| expo-camera | 57.0.6 | 58.0.14 |
| expo-file-system | 57.0.7 | 58.0.13 |
| expo-crypto | 57.0.4 | 58.0.7 |
| expo-image-picker | 57.0.20 | 58.0.10 |
| expo-asset | 57.0.20 | 58.0.19 |
| expo-font | 57.0.4 | 58.0.11 |
| expo-constants | 57.0.22 | 58.0.14 |
| expo-linking | 57.0.13 | 58.0.15 |
| expo-notifications | 57.0.23 | 58.1.7 |
| expo-print | 57.0.2 | 58.0.8 |
| expo-sharing | 57.0.24 | 58.0.21 |
| expo-clipboard | 57.0.2 | 58.0.4 |
| expo-status-bar | 57.0.1 | 58.0.4 |
| react / react-dom | 19.2.3 | 19.3.0 |
| react-native | 0.86.3 | 0.88.1 |
| react-native-safe-area-context | 5.7.0 | 5.10.1 |
| react-native-screens | 4.26.2 | 4.30.1 |
| @types/react | 19.2.18 | 19.3.0 |
| eslint-config-expo | 57.0.2 | 58.0.4 |
| react-native-web | 0.21.4 | 0.21.4 |
| TypeScript / ESLint | 6.0.3 / 9.39.5 | 동일 |
| supabase-js / AsyncStorage | 2.118.0 / 2.2.0 | 동일 |

버전 기준은 설치된 expo58의 bundledNativeModules.json, Expo CLI의 온라인 호환성 검사, SDK58 공식 문서다. 모든 직접 의존성31개의 lockfile 설치 버전과 node_modules 버전 일치를 추가 확인했다. @expo/ui와 expo-symbols는 최종 직접/전이 설치 트리에 없으며 앱은 해당 optional native API를 사용하지 않는다.

## 3. ERESOLVE 원인과 해결

### 원인

SDK57의 expo-router57.0.29는 @expo/ui57.0.26과 expo-symbols57.0.3을 일반 dependencies로 설치했다. Router58에서는 둘이 optional peer dependencies로 바뀌며 @expo/ui는 ^58.0.26을 요구한다. 기존 lock/node_modules에 남은57 버전을 npm이 계속 참고하면서 root Router58 교체 시 peer 해석에 실패했다.

따라서 오류에 @expo/ui가 나타난다고 앱에 이 라이브러리를 직접 추가할 필요는 없다. 앱에는 Stack.Toolbar, native tab md icon, @expo/ui import가 없다. @types/react와 eslint-config-expo의57 계열 설정도58 권장값으로 정렬할 필요가 있었다.

### 실제 처리

1. 기존 npm 오류 보고서와 `npm explain @expo/ui`를 확인했다.
2. `npx expo install --fix`로 공식 기대 버전을 확인했으나 동일 ERESOLVE를 재현했다.
3. package-lock-only 및 Router/UI targeted update도 기존 잠금 정보를 유지하는 해석에서 동일하게 실패했다. 강제 옵션으로 넘기지 않았다.
4. @types/react를 ~19.3.0, eslint-config-expo를 ~58.0.4로 맞췄다.
5. 기존 node_modules를 `app/.expo/sdk-57-migration-backup/node_modules`로 이동하고 기존 lock을 같은 폴더의 `package-lock.before-resolution.json`에 복사했다. 삭제하지 않았으며 Git 제외 경로다.
6. 기존 lockfile의 다른 잠금 정보를 유지한 채 이전 expo-router/@expo/ui/expo-symbols 및 Router 하위 react-is 항목만 제거해 npm이 해당 branch를 재해석하게 했다. react-server-dom-webpack 잔존 항목도 점검했으나 해당 lock 항목은 없었다.
7. 일반 `npm install`이 강제 옵션 없이 성공했다.822 packages 설치, 설치/감사 대상823 packages. npm이 최종 lockfile을 정상 갱신했다.
8. `npm ls --all --json` exit0, `expo install --check` 정상, Doctor20/20을 확인했다.

기존 lockfile 전체를 삭제하거나 npm major를 바꾸지 않았다. --force, --legacy-peer-deps, npm audit fix --force, dependency overrides를 사용하지 않았다. 백업은 여전히 .expo에 있고 사용자가 확인한 뒤 정리할 수 있다.

## 4. 변경한 파일과 코드 호환성

| 파일 | 변경 내용/이유 |
|---|---|
| app/package.json | SDK58 패키지 선언 유지·정렬, React 타입/Expo lint config58 반영 |
| app/package-lock.json | stale Router 관련 항목 해소 후 npm 정상 resolve 결과 |
| app/src/app/(tabs)/_layout.tsx | SDK58 BottomTabBarProps에 navigation이 없어 useRouter().navigate의 전체 href로 변경. 탭 이름 union으로 오타 방지 |
| app/src/app/_layout.tsx | Android edge-to-edge에서 더 이상 의존하지 않을 statusBarTranslucent 옵션 제거. 기존 light/dark/hidden 옵션 유지 |
| app/app.json | web.output=single 명시. Router58의 기본 server 출력 변경에 의한 별도 서버 요구를 피하고 기존 client-only SPA 방식 유지 |
| README.md, app/README.md | SDK58/RN0.88 실행 안내, clear-cache 시작 방법, 이 보고서 링크 |
| EXPO_SDK_58_MIGRATION_REPORT.md | 이 보고서 |

신규 기능 추가, 화면 디자인 변경, Supabase 로직 변경은 없다. React Compiler 활성화나 native 프로젝트 생성은 하지 않았다. ios/android 폴더가 없는 CNG 앱이므로 prebuild/native 파일 편집도 필요하지 않았다.

### 확인한 breaking changes

- RN0.88 strict TypeScript API와 ref/legacy deep import 변경: 실제 typecheck에서 앱 오류는 탭 바 navigation 한 건이었다. legacy type opt-out은 추가하지 않았다.
- Router58: 탭 화면 명시 선언은 기존 코드가 충족한다. module router는 event callback 안에서만 쓰여 그대로 유지했고 변경한 TabBar만 root에 바인딩되는 useRouter를 사용한다.
- Router58 optional @expo/ui/expo-symbols: 사용하지 않는 API이므로 설치하지 않았다.
- Router58 web default server: single output을 명시해 dynamic c/token/zone/id를 client route로 계속 처리한다. 배포 시 모든 경로를 index.html로 보내는 host rewrite는 필요하다.
- FileSystem58: File.write가 async로 바뀌었지만 이 앱은 write를 사용하지 않는다. 기존 File.bytes()/Crypto.digest/digestStringAsync는 유지 가능한 API다. 새 File.digest로 갈아타지 않았다.
- Notifications58 foreground 기본값 변경: 기존 setNotificationHandler가 명시적으로 동작을 정하므로 business logic을 유지했다.
- NODE_ENV 처리, iOS UIScene/R8 변경: custom AppDelegate/Gradle/환경 파일 로딩 코드가 없어 앱 코드 추가 변경은 없었다.
- web safe-area 및 modal 변화: Android native 경로와 별개로 모바일 웹의 inset/투명 sheet 시각 동작은 직접 브라우저 테스트가 필요하다. 이번에 임의 CSS/modal 재설계는 하지 않았다.

### 핵심 기능 점검

| 영역 | 코드/번들 확인 | 실제 기기 상태 |
|---|---|---|
| Stack/Tabs/dynamic routes/params | Android/web production 및 Android dev 번들 통과, TabBar API 수정 | 탭/뒤로가기/깊은 링크 미검증 |
| CameraView/permission/촬영/overlay | SDK58 모듈 및 takePictureAsync 참조 정상 | 권한/촬영/오버레이 미검증 |
| URI/bytes/SHA-256 | hash.ts 변경 없음, File.bytes/Crypto digest 경로 유지 | native bytes→hash 미검증 |
| Supabase Storage/Auth/AI wrapper | db.ts/supabase.ts/서버 파일 변경 없음, bundle/typecheck 통과 | 실제 로그인/업로드/AI 호출 미검증 |
| PDF/Sharing/Clipboard/SMS | SDK58 모듈 해석 및 bundle 통과 | OS print/share sheet 미검증 |
| Local notification/AsyncStorage | 기존 API/typecheck/번들 통과 | 예약/재시작 복원 미검증 |

샘플 JPEG의 Node SHA-256을 다시 확인해 기존 seed의 두 hash와 일치했다. 파일 hash 로직/입력 bytes/샘플 에셋을 수정하지 않았지만, Node 확인만으로 Android native digest 실행을 검증했다고 주장하지 않는다.

## 5. 실행한 검사와 결과

환경: Windows PowerShell, Node24.14.1, npm11.11.0.

| 검사 | 최종 결과 |
|---|---|
| npm install | 성공, ERESOLVE 없음 |
| npx expo install --check | Dependencies are up to date |
| npx expo-doctor | 20/20 checks passed. No issues detected |
| npm ls --depth=0 | exit0, invalid/missing 없음 |
| npm ls --all --json | exit0, 전체 peer tree 정상 |
| npm run lint | exit0, 진단 없음 |
| npx tsc --noEmit | exit0, 새 TabBar 오류 수정 후 통과 |
| npx expo config --type public | sdkVersion58.0.0, 카메라/privacy 설정 해석 성공 |
| expo export --platform android | 성공,1462 modules, Hermes .hbc 약4MB |
| expo export --platform web | 성공,1125 modules,30 JS bundles, index.html/metadata/assets |
| Expo Go mode Metro start | localhost8085 서버 구동 확인 |
| GET /status | packager-status:running |
| Android manifest | sdkVersion58.0.0, launchAsset 존재 |
| Android dev launchAsset GET | HTTP200,7,847,607 bytes;1535 modules |
| 온라인 manifest icon GET | iconUrl 생성,HTTP200 |
| git diff --check | 오류 없음(LF→CRLF 안내만 있음) |

production export 명령은 다음과 같다. 생성물은 Git 제외 .expo 하위에 둔다.

```bash
npx expo export --platform android --output-dir .expo/sdk58-validation/android --clear
npx expo export --platform web --output-dir .expo/sdk58-validation/web
```

Android Hermes 첫 실행은 sandbox의 exe 실행 제한으로 실패했고 허용된 재실행에서 통과했다. 개발 서버의 첫 실행은 DevTools 사용자 캐시 생성 제한으로 fallback을 사용했으나 정상 권한 재실행에서는 해당 오류가 사라졌다. 오프라인 진단 때 Expo manifest schema fetch가 abort돼 아이콘/폰트 경고가 있었고, 정상 온라인 모드에서는 iconUrl과 asset HTTP200을 확인했다. 코드나 이미지 자체 오류로 재현되지는 않았다. NO_COLOR/FORCE_COLOR warning은 터미널 색상 환경에 따른 비차단 메시지였다.

검증 서버는 완료 후 종료했다. localhost 검증 주소는 휴대폰에서 쓰는 주소가 아니다. 휴대폰 연결은 아래 LAN 명령으로 시작한다.

## 6. npm audit

`npm audit --json` 결과: **26개 영향 패키지 항목 — moderate25, high1, critical0, low0**. 직접 advisory와 상위 전이 영향 항목을 함께 세는 npm 수치이므로 서로 독립적인 취약점26개라는 의미는 아니다. audit 명령은 취약점이 남아 exit1이었다.

| 원인 패키지 | 심각도 | 내용/경로 | 대응 |
|---|---|---|---|
| zod3.25.76 | high(CVSS7.5) | oversized constrained collections 메모리 고갈, eslint-config-expo→eslint-plugin-react-hooks→zod. 현재 dev-only | npm advisory는 <4.6.6 범위를 표시.3→4 major 변경이므로 이번 scope에서 강제 변경하지 않음 |
| minimatch(<11.0.1) | moderate | globparts amplification DoS. ESLint/plugins/glob 전이 | SDK/린터 상위의 호환 patch를 추적 |
| glob(>=9 <=14.0.1) | moderate | AbortSignal cancellation 이후 traversal | Expo CLI/config/build tooling 전이, 상위 compatible fix 필요 |

Moderate 영향 항목25개는 @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, @expo/cli, @expo/config, @expo/config-plugins, @expo/fingerprint, @expo/inline-modules, @expo/local-build-cache-provider, @expo/metro-config, @expo/prebuild-config, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint, eslint-config-expo, eslint-plugin-expo, eslint-plugin-import, eslint-plugin-react, expo, expo-sharing, glob, minimatch다.

상위 package가 dependencies에 있다는 사실만으로 Android 사용자 런타임에 같은 공격면이 노출된다는 뜻은 아니다. 현재 주요 경로는 lint/build/CLI tooling이다. 반대로 audit 경고를 '실제 영향 없음'으로 무시하지 않고 별도 보안 유지보수 항목으로 남긴다.

npm이 일부 fix로 Expo51 또는 Sharing14로 major downgrade를 제안하므로 그대로 실행하면 SDK58 목표를 깨뜨린다. `npm audit fix --force`는 실행하지 않았다. 이 감사 결과를 이전 SDK57 대비 새로 생긴 취약점이라고 단정할 비교 감사는 하지 않았다.

- [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
- [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)

## 7. 남아 있는 문제와 범위

- 실제 Expo Go58 휴대폰 렌더링·권한·카메라·해시·PDF·local notification 동작은 미검증이다.
- 기존 Supabase 원본 서버 검증, 서명/권한, 복구 auth flow, 실제 결제/AI 비교 미완성은 SDK 마이그레이션과 별개다. 이번에 변경하지 않았다.
- 카메라/파일시스템/crypto/asset/font/이미지 선택/print/share/clipboard/AsyncStorage 등 현재 사용하는 native 모듈은 Expo Go 대상이다. 이 앱을 위해 @expo/ui나 dev-client를 새로 추가할 필요는 없었다.
- Expo Go의 Android remote push notification은 개발 빌드가 필요한 영역이다. 현재 앱은 local reminder와 앱 내 Realtime toast만 사용하므로 remote push 제한이 이번 실행의 선행 조건은 아니다.
- app.json config plugin의 permission 문구는 독립 앱 빌드에 반영되는 설정이며 Expo Go 바이너리 자체의 권한 문구/설정을 바꾸지는 않는다.
- Expo Go의 툴바/홈 메뉴가 보이는 것은 정상이다. standalone 앱 디자인과 별개다.
- 이전 설치 백업은 .expo/sdk-57-migration-backup에 남아 디스크를 사용한다. SDK58 확인 전까지 복구 자료로 보존했으며 Git에는 포함되지 않는다.

## 8. Android Expo Go58 직접 테스트

```bash
cd app
npx expo start --clear
```

PC와 휴대폰을 같은 네트워크에 두고 Expo Go가 SDK58 지원판인지 확인한다. Metro가 표시한 LAN QR을 사용한다. localhost8085는 PC 내부 진단용이었다. Windows 방화벽/LAN 격리 문제가 있으면 네트워크 경로를 먼저 확인한다.

- [ ] 앱 시작: 붉은 오류 화면/누락 native module 없이 로그인 화면과 한글 폰트 표시
- [ ] 데모 진입:4개 탭 전환, 중앙 촬영 sheet, 뒤로가기, Android gesture/status bar inset 확인
- [ ] 카메라 권한 거부/허용/재진입, 실제 사진, 구역 가이드, 퇴거35% overlay 확인
- [ ] 촬영 bytes 해시와 파일 검증 해시를 동일 원본 파일로 비교; 압축/편집 파일은 별도 hash가 되는지 확인
- [ ] 이미지 picker(계약서·검증) 취소/권한 거부/큰 이미지/재선택 확인
- [ ] 원격 환경이 준비된 경우 기존 계정 로그인/세션 유지/로그아웃/촬영 업로드/tag 저장 확인
- [ ] AI 성공/실패 시 tag 및 수동 편집 확인(실제 AI 호출 비용은 테스트 담당자가 인지)
- [ ] 입주/비교/단독/초안 PDF 생성과 파일 저장/OS share sheet 확인
- [ ] 임대인 링크 복사/SMS/OS 공유와 외부 브라우저 진입 확인(실제 발송은 의도적으로만 수행)
- [ ] local reminder 권한·채널·예약/취소 및 앱 재시작 후 동작 확인
- [ ] 회전/백그라운드 복귀/폰트 로딩/네트워크 단절 확인
- [ ] 모바일 웹 이용 시 safe-area와 capture/share sheet, dynamic route host rewrite 확인

## 9. commit/PR 전 확인

- 현재 branch chore/expo-sdk-58과 diff를 확인한다. 시작부터 있던 package 변경을 이번 마이그레이션 결과로 함께 검토한다.
- package.json/package-lock.json을 함께 commit하고, 다른 PC/CI의 `npm ci` 재현과 실기기 checklist를 확인한다. 이번에는 npm ci 재설치는 따로 실행하지 않았다.
- .expo 백업/번들, node_modules, .env 파일은 추가하지 않는다.
- Supabase/해시/business source의 비의도 변경이 없는지 확인한다.
- audit 잔존 항목과 실기기 미검증을 PR에 명시한다.
- push/PR 생성·병합은 이번 작업에서 하지 않았다.

## 10. 공식 근거

- [Expo 업그레이드 순서](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [SDK58 버전 표](https://docs.expo.dev/versions/v58.0.0/)
- [SDK58 release notes / breaking changes](https://expo.dev/changelog/sdk-58)
- [Router57→58 migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/)
- [공식 expo-upgrade skill](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-upgrade/SKILL.md)
- [FileSystem58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [Crypto58](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/), [Camera58](https://docs.expo.dev/versions/v58.0.0/sdk/camera/)
- [Notifications58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [Print58](https://docs.expo.dev/versions/v58.0.0/sdk/print/), [Sharing58](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/)

완료 범위: SDK58 의존성 정상화, 필요한 Router/API 설정 호환성 수정, 정적 검사·번들·개발 서버 검증. 미완료 검증 범위: Android Expo Go58 실기기와 외부 서비스 E2E.
