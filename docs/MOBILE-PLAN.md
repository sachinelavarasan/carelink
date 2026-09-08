# CareLink Mobile — Rebuild Plan (Expensify architecture)

Goal: re-architect `apps/mobile` to match the **Expensify mobile** app's structure
and conventions, adapted to this monorepo. Bring **auth + profile + doctor
discovery + booking + appointments** (roadmap M1 / M2 / M7) to production quality
on the new foundation. Chat (M3), prescriptions + medical history (M4), and video
(M6) are **out of scope** for this pass.

## Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Styling | **Inline `style={}` + the `@carelink/theme` token hex map** via `useTheme().color`. NativeWind was removed (deleted `global.css` / `tailwind.config.js` / `cn.ts`, de-configured Metro + Babel). Closer to how Expensify actually styles (`StyleSheet`), but still driven by the tokens shared with web. `_layout` binds React Navigation's theme to the same tokens. |
| 2 | Routing | **Adopt Expo Router** — file-based `app/`, `(auth)` + `(tabs)` groups, typed routes, deep links for notification taps. |
| 3 | Scope | **Full web v1 parity except M3 chat and M6 video.** M1 auth + profiles · M2 availability + booking + appointments · M4 prescriptions + consultation notes + medical history · M7 doctor discovery · Tier-2 already shipped on web: pre-consultation intake, patient vitals log, prescription templates. |
| 4 | Token storage | Upgrade `authToken` from `AsyncStorage` to **`expo-secure-store`** (Expensify parity). API still issues one 7-day access token, **no refresh** — interceptor just clears + signals unauthorized on 401. |
| 5 | Types / validation | Keep consuming **`@carelink/shared`** zod schemas + inferred types (better than Expensify's hand-rolled `types.d.ts`). Forms validate with the shared schemas via `@hookform/resolvers`. |
| 6 | Providers entry | Drop `App.tsx`; move all providers into `app/_layout.tsx`. `package.json` `main` → `expo-router/entry`. |

## 1. Architecture mapping (Expensify → CareLink mobile)

| Concern | Expensify | CareLink target |
|---|---|---|
| Routing | `expo-router`, `app/(root)/(auth)`, `app/(root)/dashboard/_layout` tabs | `expo-router`, `app/(auth)`, `app/(tabs)/_layout` |
| Providers | `app/_layout.tsx`: PersistQueryClient → Notification → Auth → Theme → GestureHandler → BottomSheet → Toast | same stack, wrapped in `SafeAreaProvider` |
| Auth state | `contexts/AuthContext.tsx` (`isBootstrapping`, `isSignedIn`, `signIn`, `signOut`) | `src/contexts/AuthContext.tsx` — same shape, plus `me` (from `@carelink/shared` `Me`) since screens are role-aware |
| Theme | `contexts/ThemedContext.tsx` → `colors` object | `src/theme/ThemeProvider.tsx` — `useTheme()` returns `{ theme, color, setTheme, toggle }` where `color` is the `@carelink/theme` token hex map (`color.background`, `color['muted-foreground']`, …). No NativeWind. `_layout` also feeds these into `<NavThemeProvider>` |
| Push | `contexts/NotificationContext.tsx` + `utils/registerForPushNotificationsAsync.ts` + `useSettings` enable/disable token | `src/contexts/NotificationContext.tsx` + `src/lib/push.ts`; register via `POST /me/push-tokens` (`registerPushTokenSchema`) |
| HTTP | `lib/apiClient.ts` (axios + refresh), `lib/tokenStore.ts` (in-memory + `onUnauthorized`), `lib/secureStorage.ts` | `src/lib/api.ts` (axios, **no refresh**), `src/lib/tokenStore.ts` (in-memory + `onUnauthorized`), `src/lib/authToken.ts` (SecureStore) |
| Data hooks | `hooks/useTransaction.ts`, `hooks/useUserStore.ts`, … one file per domain, `useQuery`/`useMutation` wrappers with `queryKeys` + `invalidateQueries` | `src/hooks/useAuthApi.ts`, `useProfile.ts`, `useDoctors.ts`, `useAvailability.ts`, `useAppointments.ts`, `useIntake.ts`, `usePushToken.ts` |
| Query cache persistence | `PersistQueryClientProvider` + `createAsyncStoragePersister` + `onlineManager` via `@react-native-community/netinfo` + `NetworkInfoModal` | port verbatim |
| Forms | `react-hook-form` + `zodResolver` + inline `z.object` | `react-hook-form` + `zodResolver(<shared schema>)` |
| Toast | `components/ToastMessage.tsx` + `showToast()` + `expo-haptics` | port, themed from `@carelink/theme` tokens instead of `utils/Colors` |
| Confirm dialog | `hooks/useConfirm.tsx` + `components/ConfirmModal.tsx` | port (used by cancel-appointment, sign-out) |
| Shared UI | `components/` flat: `Input`, `Spacer`, `SafeAreaView`, `BottomTabBar`, `FormErrorBanner`, `AuthLink`, `Emptystate`, `SegmentedControl`, … | `src/components/` flat, same names, inline-style + token styling. `BottomTabBar` already ported |
| Fonts | `expo-font` Inter 100–900 | `expo-font` — load **Geist** (web app's face) or defer to system font initially |
| Build | `app.config.js` with `APP_VARIANT` dev/prod, `eas.json` profiles, `EXPO_PUBLIC_API_URL` per env | expand `app.config.ts`, add `apps/mobile/eas.json` |

## 2. Target structure

```
apps/mobile/
├─ app/
│  ├─ _layout.tsx                 # all providers + AppStack; splash gate on bootstrap+fonts
│  ├─ index.tsx                   # redirect: signed-in → /(tabs), else → /(auth)/login
│  ├─ +not-found.tsx
│  ├─ (auth)/
│  │  ├─ _layout.tsx              # Stack, headerless
│  │  ├─ login.tsx
│  │  ├─ register.tsx
│  │  ├─ forgot-password.tsx
│  │  └─ reset-password.tsx       # deep link: carelink://reset?token=
│  ├─ (tabs)/
│  │  ├─ _layout.tsx              # role-aware Tabs + custom BottomTabBar
│  │  ├─ index.tsx                # Home / dashboard summary
│  │  ├─ appointments.tsx         # list, scope segmented (upcoming|past|all)
│  │  ├─ doctors.tsx              # patient: discovery.  doctor: hidden
│  │  ├─ availability.tsx         # doctor: weekly rules + exceptions. patient: hidden
│  │  └─ profile.tsx              # account + role profile + sign out + theme
│  ├─ doctor/[id].tsx             # public doctor profile → "Book"
│  ├─ book/[doctorId].tsx         # slot picker + reason + consent  (also ?reschedule=<apptId>)
│  └─ appointment/[id].tsx        # detail: status, cancel, reschedule, intake, verify-identity
├─ src/
│  ├─ contexts/   AuthContext.tsx  NotificationContext.tsx
│  ├─ theme/      ThemeProvider.tsx  ThemeToggle.tsx   (existing, kept)
│  ├─ lib/        api.ts  tokenStore.ts  authToken.ts  push.ts  cn.ts  format.ts  queryClient.ts
│  ├─ hooks/      useAuthApi.ts  useProfile.ts  useDoctors.ts  useAvailability.ts
│  │              useAppointments.ts  useIntake.ts  usePushToken.ts  useConfirm.tsx
│  └─ components/ SafeAreaView.tsx  BottomTabBar.tsx  Input.tsx  Spacer.tsx
│                 FormErrorBanner.tsx  AuthLink.tsx  Button.tsx  Field.tsx
│                 EmptyState.tsx  SegmentedControl.tsx  ToastMessage.tsx
│                 ConfirmModal.tsx  NetworkInfoModal.tsx  StatusBadge.tsx  Notice.tsx
├─ app.config.ts     # expanded: plugins, variants, eas projectId, updates, runtimeVersion
├─ eas.json          # new: development / preview / production
├─ metro.config.js   # unchanged (NativeWind wrap)
├─ babel.config.js   # unchanged (nativewind + worklets)
├─ global.css / tailwind.config.js   # unchanged
└─ package.json      # main → expo-router/entry
```

Delete after migration: `App.tsx`, `src/screens/*`, `src/lib/cn.ts` stays.

## 3. Dependencies to add

`expo-router`, `expo-secure-store`, `expo-notifications`, `expo-device`,
`expo-constants`, `expo-splash-screen`, `expo-linking`, `expo-font`,
`expo-haptics`, `expo-system-ui`, `react-native-screens`,
`react-native-gesture-handler`, `@react-native-community/netinfo`,
`@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`,
`react-hook-form`, `@hookform/resolvers`, `react-native-toast-message`,
`@gorhom/bottom-sheet` (slot / filter sheets), `date-fns` (already a repo dep),
`@expo/vector-icons`, `expo-blur` (tab bar), `react-native-element-dropdown`
(Select, ported from Expensify), `@react-native-community/datetimepicker`
(date / time — Expo-idiomatic stand-in for Expensify's `react-native-date-picker`
+ `react-native-modern-datepicker`, which we did **not** adopt).

Keep: `react-native-reanimated`, `react-native-safe-area-context`,
`@react-native-async-storage/async-storage` (query persister), `axios`,
`@tanstack/react-query`, `@carelink/shared`, `@carelink/theme` (now an explicit
dep). NativeWind + `tailwindcss` were **removed** (see Decision 1).

## 4. Phases

Each phase ends green on `npm run typecheck && npm run lint --workspace @carelink/mobile`.

### Phase 0 — Tooling & shell ✅ done
1. ✅ Added deps (§3). `package.json` `main: "expo-router/entry"`; `app.config.ts` expanded with `plugins` (`expo-router`, `expo-secure-store`, `expo-font`, `expo-splash-screen`, `expo-notifications`), `experiments.typedRoutes`, `runtimeVersion.policy = "appVersion"`. `extra.eas.projectId` / `updates.url` still to be filled by `eas init`. **`newArchEnabled` dropped** — SDK 57's `ExpoConfig` type no longer accepts it and New Arch is the default; carelink's deps (Reanimated 4, NativeWind 4, bottom-sheet 5) are all New-Arch-ready.
2. ✅ `APP_VARIANT` dev/prod switch in `app.config.ts` (name + `com.carelink.app[.dev]`).
3. ✅ `apps/mobile/eas.json` — `development` (devClient, internal), `preview` (apk, staging, `EXPO_PUBLIC_API_URL=https://carelink-api.onrender.com`), `production` (aab, autoIncrement). `submit.production` stub.
4. ✅ `.env.example` documents simulator vs LAN IP.
5. ✅ `app/_layout.tsx` provider stack (`SafeAreaProvider` → `GestureHandlerRootView` → `ThemeProvider` → `PersistQueryClientProvider` → `AuthProvider` → `BottomSheetModalProvider` → `Stack`); `src/lib/queryClient.ts` (persister + NetInfo `onlineManager`); `app/index.tsx` redirect; `app/(auth)/` + `app/(tabs)/` groups with `Redirect` guards; `app/+not-found.tsx`. The four existing screens ported into routes verbatim (rebuilt in later phases). `App.tsx` / `src/screens/` / `index.ts` deleted. `tsconfig.json` `@/* → ./src/*`.
6. ✅ Repo hygiene: mobile `react` pinned to `19.2.8` to dedupe with the hoisted copy (was nested `19.2.3`); `expo.install.exclude` for `react` / `react-dom` / `typescript` (repo stays on TS 5.x). `expo-doctor` 21/21; `typecheck` + `lint` green; `expo export --platform android` bundles clean.

### Phase 1 — Token + HTTP layer ✅ done
1. ✅ `src/lib/tokenStore.ts` — in-memory `accessToken` (`getAccessToken` / `setToken` / `clearToken`) + `onUnauthorized` / `notifyUnauthorized` (de-duped). No refresh members.
2. ✅ `src/lib/authToken.ts` — now `getStoredToken` / `setStoredToken` / `clearStoredToken` backed by `expo-secure-store` (`carelink.accessToken`), all try/catch → null. This is the persistent copy; the request path reads `tokenStore` synchronously.
3. ✅ `src/lib/api.ts` — request interceptor injects `Authorization` from `tokenStore`; response interceptor on `401` → `clearToken()` + `clearStoredToken()` + `notifyUnauthorized()`. Added `errCode` alongside `errMessage` / `isStatus`.
4. ✅ `src/lib/auth.tsx` — bootstrap hydrates SecureStore → `tokenStore` → `GET /me`; `login` writes both stores; `logout` best-effort `POST /auth/logout` then `clearSession()` (tokens + `queryClient.clear()`); `onUnauthorized` wired to `clearSession`. **Kept the existing `status: 'loading' | 'authenticated' | 'anonymous'` API** rather than Expensify's `isBootstrapping` + `isSignedIn` — the route guards already use it and it's a superset. `queryClient` (Phase 0) unchanged.

### Phase 2 — Auth screens (M1) ✅ done
1. Auth context landed in Phase 1 (`src/lib/auth.tsx`, `status` API kept).
2. ✅ `app/(auth)/_layout.tsx` headerless Stack + `Redirect` to `/(tabs)` when authenticated.
3. ✅ `login.tsx` — `react-hook-form` + `zodResolver(loginSchema)`; `403` → "verify your email" hint; success falls through to the route guard. `AuthShell` + `Field` + `Button` + `FormErrorBanner` + `AuthLink`.
4. ✅ `register.tsx` — `zodResolver(registerSchema)`; success → "check your email" `Notice` state.
5. ✅ `forgot-password.tsx` — `zodResolver(forgotPasswordSchema)` → `useForgotPassword` → sent state with a link to the reset screen.
6. ✅ `reset-password.tsx` — `useLocalSearchParams` `token` (from `carelink://reset?token=`) or a manual code field; `zodResolver(resetPasswordSchema)` → `useResetPassword`.
7. ✅ `src/hooks/useAuthApi.ts` — `useForgotPassword`, `useResetPassword`, `useResendVerification` (login / register stay in `AuthContext`).
8. `src/components/AuthShell.tsx` — shared branded frame. Deep-link association (App Links / Universal Links) deferred to the build phase; the `carelink://` scheme + param handling work today.

> **Typed-routes note:** `.expo/types/router.d.ts` is regenerated only by `expo start` (NOT `expo export` or `tsc`). After adding routes, run `npx expo start --offline` briefly (kill once the file rewrites) before `npm run typecheck`. CI (`turbo run typecheck`) needs the same step, or `.expo/types` committed, or `experiments.typedRoutes` turned off.

### Phase 3 — Design-system components ✅ done
Inline-styled from the `color` token map, under `src/components/` (+ `src/hooks/useConfirm.tsx`):
`Screen` (themed bg + gutter + optional scroll/refresh), `Button` (primary /
outline / ghost / destructive, `busy`), `Field` (label + error + password reveal,
RHF-ready), `Spacer`, `Card`, `Notice` (info / success / warning / danger),
`FormErrorBanner`, `AuthLink`, `EmptyState` (Ionicons), `StatusBadge` (via
`@carelink/theme` `appointmentStatusMeta`), `SegmentedControl` (generic `<T>`),
`ToastMessage` + `showToast` (+ `expo-haptics`), `useConfirm` / `ConfirmProvider`
(promise-based, optional reason textarea), `NetworkInfoModal` (offline banner).
`ConfirmProvider` + `ToastMessage` + `NetworkInfoModal` mounted in `_layout`.
`BottomTabBar` was already ported.

**Ported / adapted from Expensify** (re-tokened, `Inter-*` font refs dropped):
- `Select` ← `CustomSelectInput` — `react-native-element-dropdown`, searchable,
  `flat` / `clearable`, keeps the Android edge-to-edge StatusBar popup fix.
- `DatePickerField` ← `CustomDatePicker` pattern — trigger + native
  `@react-native-community/datetimepicker` (`date` | `time`), `yyyy-MM-dd` /
  `HH:mm` string value, iOS spinner-in-modal, Android dialog.
- `Field` gained `multiline` + `flat` (covers Expensify's `Input` textarea /
  in-card cases without a literal port).
- `BottomSheet` — controlled wrapper over `@gorhom/bottom-sheet` `BottomSheetModal`
  (backdrop, handle, title, safe-area).
- `RowField` / `RowSelect` / `RowDatePicker` — in-card row-style fields
  (`RowSelect` opens a `BottomSheet` list; `RowDatePicker` uses the native picker,
  no `react-native-calendars`).
- `ModalCard` ← Expensify `ModalCard` — centre or `sheet` presentation, title +
  badge + close + footer, on RN's own `Modal` + `expo-blur` (no `react-native-modal`).
- `Overlay` (full-screen spinner), `SearchBar` (icon + clear),
  `Switch` (Reanimated toggle, ← Expensify `Switch`),
  `SegmentedControl` gained per-option `count` pills + `label`.

Typecheck / lint / `expo export` / `expo-doctor` 21-21 green.

### Phase 4 — Navigation shell ✅ done
1. ✅ `app/(tabs)/_layout.tsx` — `<Tabs tabBar={BottomTabBar}>`, all 7 screens registered, hidden per role via `href: null`:
   - PATIENT: Home · Appointments · Doctors · Vitals · Profile
   - DOCTOR: Home · Appointments · Patients · Availability · Profile
2. ✅ `book.tsx` moved out of the tab group to `app/book.tsx` (stack). `doctors` / `patients` / `vitals` / `availability` are placeholder screens (`Screen` + `EmptyState`, "lands in Phase N"); `profile` is functional now (account card + role notice + sign-out via `useConfirm`).
3. Stack routes auto-discovered by expo-router as their files land (`doctor/[id]`, `appointment/[id]`, …). Splash gate + nav theme already wired.

### Phase 5 — Domain hooks (TanStack Query) ✅ done
`src/hooks/`, one file per module, `*Keys` const + `invalidateQueries` on mutate.
Built: `useProfile`, `useDoctors`, `useAvailability`, `useAppointments`
(+ `useAppointmentItems` flattener, `useInfiniteQuery`), `useIntake` /
`usePrescriptions` (404 → `null`), `useMedicalHistory` (+ `useMyPatients`),
`useVitals`, `usePrescriptionTemplates`, `usePushToken`. Endpoint paths verified
against the web client. Original per-file spec kept below for reference:
- `useProfile.ts` — `useUpdateAccount` (`PATCH /me`), `useUpsertPatientProfile` (`PUT /me/patient-profile`), `useUpsertDoctorProfile` (`PUT /me/doctor-profile`); `me` itself stays in `AuthContext`.
- `useDoctors.ts` — `useDoctors(query)` (`GET /doctors` q/specialization/sort), `useSpecializations`, `useDoctor(id)`, `useMyDoctors` (`GET /me/doctors`).
- `useAvailability.ts` — `useDoctorSlots(doctorId, from, to)` (`GET /doctors/:id/slots`); doctor: `useMyRules` / `useReplaceRules`, `useExceptions` / `useUpsertException` / `useDeleteException`, `useCloseRange` (`PUT /me/availability/exceptions/range`).
- `useAppointments.ts` — `useAppointments(scope)` (`useInfiniteQuery`, keyset cursor), `useAppointmentSummary` (`GET /appointments/summary` — home dashboard), `useAppointment(id)`, `useBookAppointment`, `useCancelAppointment`, `useRescheduleAppointment`, `useVerifyIdentity` (doctor).
- `useIntake.ts` — `useIntake(apptId)`, `useSaveIntake` (`PUT /appointments/:id/intake`).
- `usePrescriptions.ts` — `useAppointmentPrescription(apptId)` (`GET /appointments/:id/prescription`), `usePrescription(id)`, `useCreatePrescription` (draft `POST /prescriptions`), `useUpdatePrescription` (`PATCH`), `useFinalizePrescription` (`POST /prescriptions/:id/finalize`); PDF via `openPrescriptionPdf(id)` (see Phase 11).
- `useMedicalHistory.ts` — `useMedicalHistory()` (patient, `GET /medical-history`), `usePatientHistory(patientId)` (doctor, `GET /patients/:id/history`).
- `useVitals.ts` — `useMyVitals` (`GET /me/vitals`), `useAddVital` (`POST /me/vitals`), `useDeleteVital` (`DELETE /me/vitals/:id`), `usePatientVitals(patientId)` (doctor, `GET /patients/:id/vitals`).
- `usePrescriptionTemplates.ts` — `useTemplates`, `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate` (`/me/prescription-templates[/:id]`, doctor).
- `usePushToken.ts` — `useRegisterPushToken` (`POST /me/push-tokens`), `useDisablePushToken`.

### Phase 6 — Home (dashboard) ✅ done
`app/(tabs)/index.tsx` — greeting + role line; profile-incomplete / follow-ups-due
(patient) / draft-prescriptions (doctor) `Notice`s; a wrap of `StatTile`s from
`useAppointmentSummary` (role-specific set); "Next up" / "Today's schedule" list
from `useAppointmentItems('upcoming')` with `StatusBadge`; "Recent consultations"
(patient, `useMedicalHistory`) / "Recent patients" (doctor, `useMyPatients`).
Pull-to-refresh. New: `StatTile` component, `relativeDay` / `isToday` / `fmtDate`
in `format.ts`, `enabled` guards added to `useMedicalHistory` / `useMyPatients`.
Schedule rows link to the appointments tab for now → `appointment/[id]` in Phase 9.

### Phase 7 — Doctor discovery (M7, patient) ✅ done
1. ✅ `app/(tabs)/doctors.tsx` — `SearchBar` + `useDebouncedValue`, specialization `Select`, sort `SegmentedControl`, "Doctors you've seen" section from `useMyDoctors` (folded into this screen as on web — no separate `my-doctors` route), cards → `/doctor/[id]`, "Book again" → `/book?doctorId=`.
2. ✅ `app/doctor/[id].tsx` — public profile + clinic block (`Linking` for map / tel), **Book a consultation** → `/book?doctorId=`. Stack header shown.

### Phase 8 — Booking (M2) ✅ done
✅ `app/book.tsx` (query-param route, matching web's `/book?doctorId=`) — resolves
the doctor from `?doctorId=` or, when `?reschedule=<id>`, from `useAppointment`;
`useDoctorSlots` grouped by day, tap-to-pick slot chips, `Field` reason +
`Switch` consent (required for a new booking, skipped when rescheduling),
`?date=` widens the slot window and shows a follow-up `Notice`. Submit →
`useBookAppointment` / `useRescheduleAppointment` → `showToast` +
`router.replace('/(tabs)/appointments')`. Redirects to `/(tabs)/doctors` with no
context.

### Phase 9 — Appointments (M2) ✅ done
1. `app/(tabs)/appointments.tsx` — `SegmentedControl` scope (upcoming / past / all), infinite list, `StatusBadge`, empty states, pull-to-refresh → `appointment/[id]`.
2. `app/appointment/[id].tsx` — header (counterparty, time, `StatusBadge`), consent + `identityVerifiedAt` read-only, actions by role × status:
   - PATIENT, upcoming: **Cancel** (`useConfirm` + reason), **Reschedule** (→ `book/[doctorId]?reschedule=id`), **Intake form** (→ `appointment/[id]/intake`).
   - DOCTOR, upcoming/in-window: **Verify identity** (`useVerifyIdentity`), read patient intake inline, **Write / edit prescription** (→ `appointment/[id]/prescription`).
   - Any, COMPLETED: **View prescription** (→ `prescription/[id]`).

### Phase 10 — Pre-consultation intake (Tier 2, patient) ✅ done
`app/appointment/[id]/intake.tsx` — `react-hook-form` + `zodResolver(appointmentIntakeSchema)`
(chief complaint, onset, `IntakeSeverity`, current meds, allergies, notes),
`useIntake` / `useSaveIntake`; blocked once the appointment is COMPLETED /
CANCELLED. Doctor sees the saved answers inline on the appointment + prescription
screens.

### Phase 11 — Prescriptions + consultation notes (M4) ✅ done
1. `app/appointment/[id]/prescription.tsx` (doctor) — form: symptoms, diagnosis,
   advice, doctor-only clinical `notes`, follow-up date, `DrugCategoryFlag`s, and
   medicine rows (`medicineItemSchema`: drug / strength / form / frequency /
   duration / instructions). "Start from a template" picker (`usePrescriptionTemplates`)
   and "insert favourite medicine" from `me.doctorProfile.favoriteMedicines`.
   `useCreatePrescription` (draft) → `useUpdatePrescription` (autosave / save) →
   `useFinalizePrescription` (confirm modal — irreversible, flips appointment to
   COMPLETED). Read intake inline.
2. `app/prescription/[id].tsx` (patient + doctor) — rendered prescription detail;
   **Download / share PDF**: `GET /prescriptions/:id/pdf` fetched through `api`
   (`responseType: 'arraybuffer'`) → `expo-file-system` write to cache →
   `expo-sharing` share sheet (falls back to `expo-web-browser` open). Add
   `expo-file-system` + `expo-sharing` in this phase.
3. Patient push / list entry point comes from the appointment card + medical history.

### Phase 12 — Medical history (M4) ✅ done
- `app/medical-history.tsx` (patient, `useMedicalHistory`) — past appointments with
  finalised prescriptions, each row → `prescription/[id]`.
- `app/patient/[id]/history.tsx` (doctor, `usePatientHistory`) — same view scoped
  to one patient (own appointments only), reached from the Patients tab / an
  appointment.

### Phase 13 — Patient vitals (Tier 2) ✅ done
- `app/(tabs)/vitals.tsx` (patient) — list from `useMyVitals`, add-entry sheet
  (`vitalEntrySchema`: weight / BP / HR / blood sugar / temperature), swipe to
  delete (`useDeleteVital`). Lightweight trend: latest value + delta per metric;
  optional `react-native-svg` sparkline (defer the chart if it bloats the phase).
- Doctor reads a patient's vitals via `usePatientVitals` on `patient/[id]/history`.

### Phase 14 — Prescription templates (Tier 2, doctor) ✅ done
`app/templates.tsx` — list + create / edit / delete (`usePrescriptionTemplates`),
form mirrors the prescription skeleton (name, symptoms, diagnosis, advice,
medicines, follow-up offset). Consumed by the Phase 11 "start from a template"
picker.

### Phase 15 — Profile / account + doctor availability ✅ done
1. `app/(tabs)/profile.tsx` — account form (`updateAccountSchema`), role profile
   form (patient: `patientProfileSchema`; doctor: `doctorProfileSchema` incl.
   `favoriteMedicines` rows), theme toggle, links to secondary screens, **Sign
   out** (`useConfirm`). DPDP `GET /me/export` / `DELETE /me` deferred.
2. `app/(tabs)/availability.tsx` (doctor) — weekly `AvailabilityRule` editor
   (replace-all via `useReplaceRules`), date exceptions list + add/delete, range
   close (holiday / leave) via `useCloseRange`. Phone-sized: one weekday at a time.

### Phase 16 — Push notifications ✅ done
1. `src/lib/push.ts` — `registerForPushNotificationsAsync()` (permissions, `expo-device` guard, `getExpoPushTokenAsync`, Android channel).
2. `src/contexts/NotificationContext.tsx` — request token, expose `expoPushToken`, received/response listeners; on tap route by `data.type` (`appointment_reminder` / `prescription_ready` → the relevant screen).
3. `AuthContext` effect: `status === 'authenticated' && expoPushToken` → `useRegisterPushToken({ token, platform })`; on `signOut` → best-effort `useDisablePushToken`.
4. `Notifications.setNotificationHandler` in `_layout`.

### Phase 17 — Offline + resilience ✅ done
`persistOptions` (maxAge 1 day) already wired; add `NetworkInfoModal` in `_layout`,
confirm mutations (book / cancel / finalize) disable + toast when `onlineManager`
reports offline.

### Phase 18 — Build & release ◐ in progress
1. ✅ `eas init` — `extra.eas.projectId` + `updates.url` set; `eas.json` dev/preview/production; `expo-build-properties` + `withIncreasedMetaspace`; `.easignore`.
2. ✅ **Assets & fonts** — `assets/images/{icon,logo,splash-icon,splash-icon-dark,android-icon-foreground,android-icon-monochrome}.png` + `assets/fonts/Inter-*.ttf` (9 weights). `app.config.ts`: `icon`, `android.adaptiveIcon` (foreground + monochrome), `expo-splash-screen` image + dark image, `expo-font` plugin embeds the Inter faces. `withColorOnlySplash` plugin removed (only needed for a colour-only splash). `src/lib/fonts.ts` loads the faces via `useFonts` and patches `Text` / `TextInput` to map `fontWeight` → the matching `Inter-*` face (explicit `fontFamily` still wins) — no per-screen edits. `_layout` holds the splash until auth **and** fonts are ready. `AuthShell` shows `logo.png`. Root `eslint.config.mjs` gained an `apps/mobile` override for asset `require()`.
   _Supplied icon/foreground PNGs are ~270–280 px — replace with 1024×1024 before a store build._
3. `eas build --profile development` → dev client; smoke test against the deployed API. _(yours to run)_
4. `preview` internal build for the doctor.
5. Update `README.md` "Mobile" section (no longer "paused after M2").

### Phase 19 — QA pass
`npm run typecheck`, `npm run lint`, `expo export`; manual matrix: patient +
doctor × light/dark × discover → book → intake → consult → prescription →
history, cancel / reschedule, vitals add/delete, templates, deep-link
reset-password, notification tap, airplane-mode.

## 5. API endpoints consumed (all under `API_PREFIX`, Bearer token)

auth: `POST /auth/{register,login,logout,forgot,reset,resend-verification}`,
`GET /auth/verify?token=` ·
me: `GET /me`, `PATCH /me`, `PUT /me/patient-profile`, `PUT /me/doctor-profile`,
`GET /me/doctors`, `POST /me/push-tokens` ·
discovery: `GET /doctors`, `GET /doctors/:id`, `GET /doctors/specializations`,
`GET /doctors/:id/slots?from&to` ·
doctor availability: `GET/PUT /me/availability/rules`,
`GET/PUT/DELETE /me/availability/exceptions`,
`PUT/DELETE /me/availability/exceptions/range?from&to` ·
appointments: `POST /appointments`, `GET /appointments?scope=`,
`GET /appointments/summary`, `GET /appointments/:id`,
`POST /appointments/:id/{cancel,reschedule,verify-identity}` ·
intake: `GET/PUT /appointments/:id/intake` ·
prescriptions: `POST /prescriptions`, `PATCH /prescriptions/:id`,
`POST /prescriptions/:id/finalize`, `GET /prescriptions/:id`,
`GET /prescriptions/:id/pdf`, `GET /appointments/:id/prescription`,
`GET/POST/PATCH/DELETE /me/prescription-templates[/:id]` ·
history: `GET /medical-history`, `GET /patients/:id/history` ·
vitals: `GET/POST /me/vitals`, `DELETE /me/vitals/:id`, `GET /patients/:id/vitals`

All request/response shapes come from `@carelink/shared` (`loginSchema`,
`registerSchema`, `createAppointmentSchema`, `appointmentPageSchema`,
`appointmentSummarySchema`, `doctorPublicSchema`, `slotSchema`,
`appointmentIntakeSchema`, `medicineItemSchema`, `vitalEntrySchema`,
`registerPushTokenSchema`, …).

## 6. Deferred (not this pass)

- **M3 chat consultation** (polling thread, messages) — explicitly out
- **M6 video** (`@jitsi/react-native-sdk`) — explicitly out
- In-app notification centre, medical documents upload, reviews & ratings
- DPDP `GET /me/export` / `DELETE /me` self-service UI
- iOS build/submit config (Android-first, mirroring Expensify's `eas.json`)
- Self-signup gating (web currently hides `/register`; mirror by hiding the
  mobile register link if accounts are provisioned — confirm with product)

## 7. Risks / notes

- **`@carelink/shared` must build before mobile typechecks** — CI/turbo already
  orders this (`dependsOn: ["^build"]`).
- **No NativeWind** — styling is inline `style={}` off the `color` token map.
  Keep a small `Screen` / `Card` / `Button` set so screens stay terse; avoid
  re-deriving the same style objects inline everywhere.
- **PDF handling** — no direct-link downloads on device (Expo sandbox). Fetch the
  prescription PDF through `api` and hand it to `expo-sharing` / `expo-web-browser`.
- **`appVersionSource: "remote"`** in `eas.json` needs `eas init` + a project on
  EAS before the first build; until then use local `expo run:android`.
- **New Architecture** — SDK 57 runs New Arch by default and the `ExpoConfig`
  type no longer accepts `newArchEnabled` (Expensify's `false` in a plain-JS
  config is inert). CareLink's mobile deps are all New-Arch-ready; left on the
  default.
- **Fonts** — web uses Geist; loading it on mobile is optional. Start with system
  font, add `expo-font` + Geist in a follow-up to keep this pass lean.
- **Doctor on mobile** — PLAN decision 4 says doctors get mobile too; availability
  editing on a phone is fiddly. Ship a minimal weekly-rules editor; full parity
  with the web `/availability` (range close, exception calendar) can follow.
- **Existing screens** (`AuthScreen`, `HomeScreen`, `AppointmentsScreen`,
  `BookScreen`, `MainTabs`) are replaced, not migrated in place — copy any working
  markup, then delete `src/screens/`.
