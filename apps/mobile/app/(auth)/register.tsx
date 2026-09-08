import { Redirect } from 'expo-router';

// Self-signup is hidden for now — accounts are provisioned. Any link or deep
// link to /register lands on sign-in instead (mirrors the web app).
export default function Register() {
  return <Redirect href="/(auth)/login" />;
}
