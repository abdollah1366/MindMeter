import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TestRunner from "@/components/TestRunner";
import { getTest, tests } from "@/data/tests";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return tests.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const test = getTest(slug);
  return test ? { title: test.title, description: test.shortDescription } : {};
}

export default async function TestPage({ params }: Props) {
  const { slug } = await params;
  const test = getTest(slug);
  if (!test) notFound();

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold">{test.title}</h1>
        <p className="mt-3 leading-8 text-slate-600">{test.instructions}</p>
      </header>
      <TestRunner test={test} />
    </>
  );
}
