import { headers } from "next/headers";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { listPages } from "@/lib/pages/repository";
import { formatDate } from "@/lib/format";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import SendControls from "@/components/dashboard/SendControls";
import GlassPanel from "@/components/ui/GlassPanel";
import type { PageRecord } from "@/lib/pages/types";

export const dynamic = "force-dynamic";

async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function PublishedUrlsPage() {
  const [pages, origin] = await Promise.all([listPages(), getOrigin()]);
  // 지금 발행 상태인 것만이 아니라, 한 번이라도 발행된 적 있는 페이지를 전부
  // 모아 보여준다 — 나중에 보관 처리했어도 "언제 이걸 보냈었지" 확인할 기록으로 남긴다.
  // 정렬은 실제로 보낸 날이 있으면 그 날 기준이다 — 최근에 보낸 것이 위로 온다.
  const sortKey = (page: PageRecord) => page.sentOn ?? page.publishedAt!;
  const everPublished = pages
    .filter((page) => page.publishedAt !== null)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  // 이미 쓰인 태그를 모아 자동완성 후보로 넘긴다.
  const tagSuggestions = [...new Set(pages.flatMap((page) => page.sendTags))].sort();

  return (
    <div className="mx-auto max-w-[1160px] p-8">
      <h1 className="font-display text-2xl font-extrabold text-[#111827]">발행된 URL</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-[#4b5563]">
        한 번이라도 발행했던 페이지의 기록이에요. 지금도 발행 중인 링크만 카카오톡 버튼에
        연결하세요 — 보관된 페이지는 방문자에게 &ldquo;아직 공개되지 않은 페이지&rdquo;로 보여요.
      </p>

      {everPublished.length === 0 ? (
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="mt-6">
          아직 발행된 페이지가 없어요.
        </Text>
      ) : (
        <GlassPanel className="mt-6">
          <VStack as="ul" gap={0}>
            {everPublished.map((page, index) => (
              <HStack
                key={page.id}
                as="li"
                align="center"
                justify="space-between"
                gap="x4"
                px="x4"
                py="x4"
                borderBottomWidth={index === everPublished.length - 1 ? 0 : 1}
                borderColor="stroke.neutralWeak"
              >
                <Box minWidth="0" flexGrow={1}>
                  <HStack align="center" gap="x2" minWidth="0">
                    <StatusBadge status={page.status} sentOn={page.sentOn} />
                    <Text as="p" textStyle="t4Medium" color="fg.neutral" maxLines={1}>
                      {page.title}
                    </Text>
                  </HStack>
                  <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle" className="mt-1">
                    발행일 {formatDate(page.publishedAt!)}
                  </Text>
                  <SendControls
                    pageId={page.id}
                    initialSentOn={page.sentOn}
                    initialTags={page.sendTags}
                    tagSuggestions={tagSuggestions}
                  />
                  <input
                    type="text"
                    readOnly
                    value={`${origin}/c/${page.slug}`}
                    className="glass-field focus-flame font-num mt-1.5 w-full px-2.5 py-1.5 text-sm text-[#4b5563]"
                  />
                </Box>
                <CopyLinkButton slug={page.slug} />
              </HStack>
            ))}
          </VStack>
        </GlassPanel>
      )}
    </div>
  );
}
