import { useCallback } from "react";
import {
  Link,
  Route,
  Switch,
  useLocation as useWouterLocation,
  useParams,
} from "wouter";
import { useHistoryState } from "wouter/use-browser-location";
import type { NavigateOptions } from "wouter";

type Navigate = (to: string, options?: NavigateOptions) => void;

export const useNavigate = (): Navigate => {
  const [, navigate] = useWouterLocation();

  return useCallback(
    (to: string, options?: NavigateOptions) => navigate(to, options),
    [navigate],
  );
};

export const useLocation = <State = unknown>() => {
  const [pathname] = useWouterLocation();
  const state = useHistoryState<State>();

  return { pathname, state };
};

export { Link, Route, Switch, useParams };
