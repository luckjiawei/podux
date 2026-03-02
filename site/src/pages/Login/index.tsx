import { useLogin } from "./useLogin";
import { LoginView } from "./LoginPage.view";

export function LoginPage() {
  const loginState = useLogin();

  return <LoginView {...loginState} />;
}

export default LoginPage;
