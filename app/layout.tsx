import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Zirkhaki',description:'A live treasure card game for 2–8 friends. Join by room code, push your luck, and know when to collect.',icons:{icon:'/logo.png',shortcut:'/logo.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
