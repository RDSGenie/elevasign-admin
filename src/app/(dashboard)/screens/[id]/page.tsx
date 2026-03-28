export default function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Screen Detail</h1>
    </div>
  );
}
