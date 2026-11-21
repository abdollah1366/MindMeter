import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ ref?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const { ref } = await searchParams;
  const query = ref ? `?next=/referral&ref=${encodeURIComponent(ref)}` : "?next=/my-results";
  redirect(`/login${query}`);
}
