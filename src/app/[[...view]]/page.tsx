import Demo from '@/components/demo';
export default async function Page({ params }: { params: Promise<{ view?: string[] }> }) {
  const { view } = await params;
  return (
    <Demo
      surface={
        view?.[0] === 'platform' || view?.[0] === 'devices' || view?.[0] === 'login'
          ? 'platform'
          : 'device'
      }
    />
  );
}
