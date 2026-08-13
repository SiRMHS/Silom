import localFont from "next/font/local";

export const peyda = localFont({
  src: [
    {
      path: "../../fonts/peyda/PeydaWebFaNum-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../fonts/peyda/PeydaWebFaNum-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../fonts/peyda/PeydaWebFaNum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/peyda/PeydaWebFaNum-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/peyda/PeydaWebFaNum-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../fonts/peyda/PeydaWebFaNum-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../fonts/peyda/PeydaWebFaNum-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-peyda",
  display: "swap",
});
