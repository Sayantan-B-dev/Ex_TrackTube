"use client";

import { useParams } from "next/navigation";

export default function PlaylistPage() {
  const params = useParams();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h1>Playlist: {params.id}</h1>
      <p>Playlist view coming in the next phase.</p>
    </div>
  );
}