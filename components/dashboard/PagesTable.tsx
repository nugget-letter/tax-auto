import Link from "next/link";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import type { PageRecord, PageStatus } from "@/lib/pages/types";
import { formatDate } from "@/lib/format";
import GlassPanel from "@/components/ui/GlassPanel";
import SectionLabel from "@/components/ui/SectionLabel";
import Chip from "@/components/ui/Chip";
import StatusBadge from "./StatusBadge";
import CopyLinkButton from "./CopyLinkButton";
import DuplicateButton from "./DuplicateButton";
import StatusActionButton from "./StatusActionButton";
import DeleteButton from "./DeleteButton";

const GROUPS: { status: PageStatus; heading: string }[] = [
  { status: "published", heading: "발행됨" },
  { status: "draft", heading: "임시저장" },
  { status: "archived", heading: "보관" },
];

function PageRow({ page, isLast }: { page: PageRecord; isLast: boolean }) {
  return (
    <HStack
      as="li"
      align="center"
      justify="space-between"
      gap="x4"
      px="x4"
      py="x4"
      borderBottomWidth={isLast ? 0 : 1}
      borderColor="stroke.neutralWeak"
    >
      <Box minWidth="0" flexGrow={1}>
        <HStack align="center" gap="x2" minWidth="0">
          <StatusBadge status={page.status} sentOn={page.sentOn} />
          <Text as="span" textStyle="t4Medium" color="fg.neutral" maxLines={1}>
            {page.title}
          </Text>
        </HStack>
        <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="mt-1">
          생성 {formatDate(page.createdAt)} · 수정 {formatDate(page.updatedAt)}
          {page.sentOn && ` · 전송 ${formatDate(page.sentOn)}`}
        </Text>
        {/* 태그는 여기서 읽기 전용으로만 보여준다. 편집은 발행된 URL 화면에서 한다. */}
        {page.sendTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {page.sendTags.map((tag) => (
              <Chip key={tag} tone="gray">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </Box>
      <HStack flexShrink={0} align="center" gap="x2">
        <HStack align="center" gap="x1">
          <CopyLinkButton slug={page.slug} />
          <ActionButton
            asChild
            variant="ghost"
            size="xsmall"
            fontWeight="medium"
            color="fg.neutralSubtle"
          >
            <Link href={`/admin/${page.id}/edit`}>수정</Link>
          </ActionButton>
          <DuplicateButton id={page.id} />
        </HStack>
        <Box borderLeftWidth={1} borderColor="stroke.neutralWeak" height="x4" />
        <HStack align="center" gap="x1">
          <StatusActionButton id={page.id} status={page.status} />
          <DeleteButton id={page.id} title={page.title} slug={page.slug} publishedAt={page.publishedAt} />
        </HStack>
      </HStack>
    </HStack>
  );
}

export default function PagesTable({ pages }: { pages: PageRecord[] }) {
  if (pages.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
        아직 생성된 페이지가 없어요.
      </Text>
    );
  }

  return (
    <VStack gap="x6">
      {GROUPS.map(({ status, heading }) => {
        const groupPages = pages.filter((page) => page.status === status);
        if (groupPages.length === 0) return null;

        return (
          <Box key={status}>
            <SectionLabel as="h2">
              {heading} ({groupPages.length})
            </SectionLabel>
            <GlassPanel>
              <ul>
                {groupPages.map((page, index) => (
                  <PageRow key={page.id} page={page} isLast={index === groupPages.length - 1} />
                ))}
              </ul>
            </GlassPanel>
          </Box>
        );
      })}
    </VStack>
  );
}
