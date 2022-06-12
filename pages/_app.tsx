import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Container, Definition } from "../pagex";
import { useRouter } from "next/router";
import Link from "next/link";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

// const useRouterPage = () => {
//   const router = useRouter();
//   const [state, setState] = useState({
//     path: router.asPath,
//     status: LoadStatus.Loading,
//   });

//   useEffect(() => {
//     const handlers = {
//       start: (path: string) => {
//         alert(path);
//         setState({ path, status: LoadStatus.Loading });
//       },
//       complete: (path: string) => {
//         setState({ path, status: LoadStatus.Success });
//       },
//       error: (path: string) => {
//         setState({ path, status: LoadStatus.Error });
//       },
//     };
//     router.events.on("routeChangeStart", handlers.start);
//     router.events.on("routeChangeComplete", handlers.complete);
//     router.events.on("routeChangeError", handlers.error);

//     return () => {
//       router.events.off("routeChangeStart", handlers.start);
//       router.events.off("routeChangeComplete", handlers.complete);
//       router.events.off("routeChangeError", handlers.error);
//     };
//   }, []);

//   return state;
// };

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Container component={Component}>
        <Definition path={"/about"}></Definition>
        <Definition path={"/contact"}></Definition>
      </Container>
      <Link href="/contact" prefetch={false}>
        contact
      </Link>
      <Link href="/about" prefetch={false}>
        about
      </Link>
    </>
  );
}

export default MyApp;
