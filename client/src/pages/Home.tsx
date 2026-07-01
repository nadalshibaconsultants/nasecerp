import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Home redirects to login page - this is just a fallback
 */
export default function Home() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate("/");
  }, [navigate]);

  return null;
}
