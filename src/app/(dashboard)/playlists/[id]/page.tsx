export default function PlaylistEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Playlist Editor</h1>
    </div>
  );
}
