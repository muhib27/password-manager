import { useEffect, useState } from "react";
import { api, type Entry } from "./lib/ipc";
import { Login } from "./routes/Login";
import { Register } from "./routes/Register";
import { Vault } from "./routes/Vault";

type Screen = "loading" | "register" | "login" | "vault";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    void api.vaultExists().then((exists) => {
      setScreen(exists ? "login" : "register");
    });
  }, []);

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (screen === "register") {
    return (
      <Register
        onCreated={() => {
          setEntries([]);
          setScreen("vault");
        }}
      />
    );
  }

  if (screen === "login") {
    return (
      <Login
        onUnlocked={(nextEntries) => {
          setEntries(nextEntries);
          setScreen("vault");
        }}
      />
    );
  }

  return (
    <Vault
      initialEntries={entries}
      onLock={() => {
        setEntries([]);
        setScreen("login");
      }}
    />
  );
}
