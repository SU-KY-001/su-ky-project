import { useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ScrollView, Text, XStack, YStack, ZStack } from "tamagui";
import { AppCard, AppHeader, AppIcon, AppImage, Chip, PrimaryButton, ProgressBar, ScreenScroll } from "@/shared/ui";
import { createUuid, fallbackEventImage, podcastApi, type PublicQuizCard, type QuizAttemptResult } from "../podcastApi";

const CORRECT = "#55714A";

export interface QuizEpisodeSummary {
  slug: string;
  title: string;
  seriesTitle: string;
  image: ImageSourcePropType;
}

function toEpisodeSummary(item: PublicQuizCard): QuizEpisodeSummary {
  return {
    slug: item.episodeSlug,
    title: item.episodeTitle,
    seriesTitle: item.seriesTitle,
    image: item.posterUrl ? { uri: item.posterUrl } : fallbackEventImage(item.seriesSlug),
  };
}

export function QuizListScreen({ onPlayEpisodeQuiz }: { onPlayEpisodeQuiz: (episode: QuizEpisodeSummary) => void }): React.JSX.Element {
  const [topicId, setTopicId] = useState<string>();
  const quizzesQuery = useQuery({
    queryKey: ["podcast", "quizzes", topicId ?? "all"],
    queryFn: () => podcastApi.quizzes(topicId ? { topicId } : undefined),
  });
  const allQuizzesQuery = useQuery({
    queryKey: ["podcast", "quizzes", "topics"],
    queryFn: () => podcastApi.quizzes(),
    staleTime: 5 * 60_000,
  });
  const topics = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of allQuizzesQuery.data ?? []) {
      if (item.topicId && item.topicName) unique.set(item.topicId, item.topicName);
    }
    return [...unique.entries()];
  }, [allQuizzesQuery.data]);

  return (
    <YStack f={1} bg="$paper">
      <AppHeader title="Quiz" />
      <ScreenScroll>
      {topics.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack g="$1.5">
            <Chip label="Tất cả chủ đề" selected={!topicId} onPress={() => setTopicId(undefined)} />
            {topics.map(([id, name]) => <Chip key={id} label={name} selected={topicId === id} onPress={() => setTopicId(id)} />)}
          </XStack>
        </ScrollView>
      ) : null}

      {quizzesQuery.isPending ? (
        <YStack py="$6" items="center"><Text color="$inkSoft" fs="$1">Đang tải danh sách quiz…</Text></YStack>
      ) : quizzesQuery.isError ? (
        <YStack py="$6" items="center" g="$2">
          <Text color="$ink" fs="$2" fw="$6">Không thể tải danh sách quiz</Text>
          <Text color="$inkSoft" fs="$1" text="center">Vui lòng kiểm tra kết nối rồi thử lại.</Text>
          <PrimaryButton label="Thử lại" secondary onPress={() => void quizzesQuery.refetch()} />
        </YStack>
      ) : quizzesQuery.data?.length ? (
        <YStack g="$2">
          {quizzesQuery.data.map((item) => {
            const episode = toEpisodeSummary(item);
            return (
              <AppCard key={item.id} onPress={() => onPlayEpisodeQuiz(episode)}>
                <ZStack h={150} w="100%">
                  <AppImage source={episode.image} w="100%" h={150} resizeMode="cover" rounded={0} />
                  <YStack pos="absolute" t="$1.5" l="$1.5" bg="$vermilion" px="$2" py="$0.5" rounded="$3">
                    <Text color="$paperSoft" fs={9} fw="$7">{item.topicName ?? "QUIZ LỊCH SỬ"}</Text>
                  </YStack>
                  {item.hasCompleted ? (
                    <YStack pos="absolute" t="$1.5" r="$1.5" bg="$paperSoft" px="$2" py="$0.5" rounded="$3">
                      <Text color="$ink" fs={9} fw="$7">ĐÃ HOÀN THÀNH</Text>
                    </YStack>
                  ) : null}
                </ZStack>
                <YStack p="$3" g="$1.5">
                  <Text color="$inkSoft" fs={10} numberOfLines={1}>{item.seriesTitle}</Text>
                  <Text color="$ink" fs="$2" fw="$7" numberOfLines={2}>{item.title}</Text>
                  {item.description ? <Text color="$inkSoft" fs="$1" numberOfLines={2}>{item.description}</Text> : null}
                  <XStack items="center" justify="space-between" pt="$1.5" borderTopWidth={1} bc="$line">
                    <Text color="$inkSoft" fs={11}>{item.questionCount} câu hỏi · {item.plays} lượt chơi</Text>
                    <AppIcon name="chevron-right" size={16} color="#B8322A" />
                  </XStack>
                </YStack>
              </AppCard>
            );
          })}
        </YStack>
      ) : (
        <YStack py="$8" items="center" g="$1">
          <Text color="$ink" fs="$2" fw="$6">Chưa có quiz trong chủ đề này</Text>
          <Text color="$inkSoft" fs="$1">Hãy chọn chủ đề khác để tiếp tục.</Text>
        </YStack>
      )}
      </ScreenScroll>
    </YStack>
  );
}

interface EpisodeQuizScreenProps {
  episode: QuizEpisodeSummary;
  signedIn: boolean;
  onBack: () => void;
  onRequireAuth: () => void;
}

export function EpisodeQuizScreen({ episode, signedIn, onBack, onRequireAuth }: EpisodeQuizScreenProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const idempotencyKey = useRef(createUuid());
  const quizQuery = useQuery({
    queryKey: ["podcast", "quiz", episode.slug],
    queryFn: () => podcastApi.quiz(episode.slug),
    enabled: signedIn,
  });
  const submitMutation = useMutation({
    mutationFn: async () => {
      const quiz = quizQuery.data;
      if (!quiz) throw new Error("Chưa có dữ liệu quiz");
      return podcastApi.attempt(
        quiz.id,
        quiz.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] ?? null })),
        idempotencyKey.current,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["podcast", "quizzes"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const retry = (): void => {
    setCurrentIndex(0);
    setAnswers({});
    idempotencyKey.current = createUuid();
    submitMutation.reset();
  };

  if (!signedIn) {
    return (
      <YStack f={1} bg="$paper">
        <AppHeader title="Ôn tập sau khi nghe" onBack={onBack} />
        <YStack f={1} items="center" justify="center" p="$4" g="$2">
          <AppIcon name="lock" size={36} color="#B58A3C" />
          <Text color="$ink" fs="$3" fw="$7" text="center">Đăng nhập để làm quiz</Text>
          <Text color="$inkSoft" fs="$1" text="center">Kết quả, XP và nhiệm vụ tuần sẽ được lưu vào tài khoản của bạn.</Text>
          <PrimaryButton label="Đăng nhập" onPress={onRequireAuth} />
        </YStack>
      </YStack>
    );
  }

  if (quizQuery.isPending) {
    return <YStack f={1} bg="$paper"><AppHeader title="Ôn tập sau khi nghe" onBack={onBack} /><YStack f={1} items="center" justify="center"><Text color="$inkSoft" fs="$1">Đang tải bộ câu hỏi…</Text></YStack></YStack>;
  }

  const quiz = quizQuery.data;
  if (quizQuery.isError || !quiz || quiz.questions.length === 0) {
    return (
      <YStack f={1} bg="$paper">
        <AppHeader title="Ôn tập sau khi nghe" onBack={onBack} />
        <YStack f={1} items="center" justify="center" p="$4" g="$2">
          <Text color="$ink" fs="$3" fw="$7" text="center">Không thể tải bộ câu hỏi</Text>
          <Text color="$inkSoft" fs="$1" text="center">Vui lòng kiểm tra kết nối rồi thử lại.</Text>
          <PrimaryButton label="Thử lại" secondary onPress={() => void quizQuery.refetch()} />
        </YStack>
      </YStack>
    );
  }

  const result: QuizAttemptResult | undefined = submitMutation.data;
  if (result) {
    const correctCount = result.answers.filter((item) => item.isCorrect).length;
    return (
      <YStack f={1} bg="$paper">
        <AppHeader title="Kết quả bài quiz" onBack={onBack} />
        <ScrollView f={1} showsVerticalScrollIndicator={false}>
          <YStack px="$3" pb="$4" g="$3">
            <AppCard>
              <XStack p="$3" items="center" g="$3">
                <YStack borderLeftWidth={4} bc="$vermilion" pl="$3">
                  <Text color="$ink" fs={38} fw="$7" lh={38}>{result.scorePercent}%</Text>
                  <Text color="$inkSoft" fs={11}>{correctCount}/{result.answers.length} câu đúng</Text>
                </YStack>
                <YStack f={1} g="$0.5">
                  <Text color="$bronzeDark" fs={11} fw="$7">{result.isPassed ? "ĐÃ VƯỢT QUA" : "CHƯA ĐẠT ĐIỂM QUA"}</Text>
                  <Text color="$ink" fs="$3" fw="$7">{result.isPassed ? "Chúc mừng bạn!" : "Bạn có thể thử lại"}</Text>
                  <Text color="$inkSoft" fs={11}>+{result.xpAwarded} XP · Tổng {result.totalXp} XP</Text>
                </YStack>
              </XStack>
            </AppCard>
            <Text color="$ink" fs="$3" fw="$7">Đáp án và lời giải</Text>
            {result.answers.map((answer, index) => {
              const question = quiz.questions.find((item) => item.id === answer.questionId);
              const selected = question?.options.find((item) => item.id === answer.selectedOptionId);
              const correct = question?.options.find((item) => item.id === answer.correctOptionId);
              return (
                <AppCard key={answer.questionId}>
                  <YStack p="$3" g="$1">
                    <Text color="$ink" fs="$2" fw="$7">{index + 1}. {question?.text}</Text>
                    <Text color={answer.isCorrect ? CORRECT : "$vermilion"} fs="$1">Bạn chọn: {selected?.label}. {selected?.text}</Text>
                    {!answer.isCorrect ? <Text color="$ink" fs="$1">Đáp án đúng: {correct?.label}. {correct?.text}</Text> : null}
                    {answer.explanation ? <Text color="$inkSoft" fs={11} lh={16}>{answer.explanation}</Text> : null}
                  </YStack>
                </AppCard>
              );
            })}
            <XStack g="$2"><YStack f={1}><PrimaryButton label="Quay lại" secondary onPress={onBack} /></YStack><YStack f={1}><PrimaryButton label="Làm lại" icon="rotate-ccw" onPress={retry} /></YStack></XStack>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const selectedOptionId = answers[currentQuestion.id];
  const isLastQuestion = currentIndex === quiz.questions.length - 1;
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  return (
    <YStack f={1} bg="$paper">
      <AppHeader title="Ôn tập sau khi nghe" onBack={onBack} />
      <ScrollView f={1} showsVerticalScrollIndicator={false}>
        <YStack px="$3" pb="$4" g="$2.5">
          <AppCard>
            <ZStack h={140} w="100%">
              <AppImage source={episode.image} w="100%" h={140} resizeMode="cover" rounded={0} />
              <YStack pos="absolute" l="$2.5" b="$2.5" r="$2.5" g="$0.5">
                <Text color="$paperSoft" fs={9} fw="$7" bg="$bronzeDark" self="flex-start" px="$1.5" py="$0.5" rounded="$2">{episode.seriesTitle.toUpperCase()}</Text>
                <Text color="$paperSoft" fs="$2" fw="$7" numberOfLines={1}>{episode.title}</Text>
              </YStack>
            </ZStack>
          </AppCard>
          <XStack items="center" justify="space-between"><Text color="$inkSoft" fs={11} fw="$6">Câu {currentIndex + 1} / {quiz.questions.length}</Text><Text color="$inkSoft" fs={11}>{progressPercent}%</Text></XStack>
          <ProgressBar value={progressPercent} />
          <Text color="$ink" fs="$4" lh={24} fw="$7">{currentQuestion.text}</Text>
          <YStack g="$2">
            {currentQuestion.options.map((option) => {
              const selected = selectedOptionId === option.id;
              return (
                <Button key={option.id} unstyled minH={54} px="$3" py="$2.5" fd="row" items="center" g="$2.5" rounded="$5" bg={selected ? "$paperDeep" : "$paperSoft"} bw={selected ? 1.5 : 1} bc={selected ? "$vermilion" : "$line"} onPress={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option.id }))} pressStyle={{ op: 0.8 }}>
                  <YStack w={30} h={30} rounded={8} bg={selected ? "$vermilion" : "$paper"} items="center" justify="center"><Text color={selected ? "$paperSoft" : "$inkSoft"} fs={12} fw="$7">{option.label}</Text></YStack>
                  <Text f={1} color="$ink" fs="$2" fw={selected ? "$7" : "$5"}>{option.text}</Text>
                </Button>
              );
            })}
          </YStack>
          {submitMutation.isError ? <Text color="$vermilion" fs={11}>Chưa gửi được bài thi. Vui lòng thử lại.</Text> : null}
        </YStack>
      </ScrollView>
      <XStack px="$3" py="$2.5" bg="$paperSoft" borderTopWidth={1} bc="$line" items="center" justify="space-between" g="$2">
        <Button unstyled h="$4" px="$3" disabled={currentIndex === 0} op={currentIndex === 0 ? 0.4 : 1} onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}><Text color="$ink" fs="$1" fw="$6">Câu trước</Text></Button>
        {!isLastQuestion ? <PrimaryButton label="Câu tiếp theo" disabled={!selectedOptionId} onPress={() => setCurrentIndex((value) => value + 1)} /> : <PrimaryButton label={submitMutation.isPending ? "Đang chấm bài…" : "Nộp bài"} disabled={!selectedOptionId || submitMutation.isPending} onPress={() => submitMutation.mutate()} />}
      </XStack>
    </YStack>
  );
}
