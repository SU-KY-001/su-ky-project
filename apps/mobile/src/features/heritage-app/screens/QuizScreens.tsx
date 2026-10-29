import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ScrollView, Text, XStack, YStack, ZStack } from "tamagui";
import {
  AppCard,
  AppHeader,
  AppIcon,
  AppImage,
  Chip,
  PrimaryButton,
  ProgressBar,
  ScreenScroll,
  SectionHeader,
} from "@/shared/ui";
import { createUuid, podcastApi, type PodcastEpisode, type PublicQuiz, type QuizAttemptResult } from "../podcastApi";
import { quizSets, type QuizSet, type QuizTopic } from "../quizData";

const CORRECT_BG = "#E5EDD9";
const CORRECT = "#55714A";
const WRONG_BG = "#F6DEDA";
const answerLetters = ["A", "B", "C", "D"];
const topics: QuizTopic[] = ["Tất cả", "Lịch sử", "Nhân vật", "Văn hóa"];

function QuizCover({ quiz, height, rounded = 14 }: { quiz: QuizSet; height: number; rounded?: number }): React.JSX.Element {
  return (
    <ZStack h={height} overflow="hidden" rounded={rounded} style={{ backgroundColor: quiz.accent }}>
      {quiz.poster ? <AppImage source={quiz.poster} w="100%" h="100%" rounded={0} resizeMode="cover" /> : null}
      <YStack f={1} style={{ backgroundColor: quiz.accent, opacity: quiz.poster ? 0.62 : 1 }} />
      <YStack f={1} items="center" justify="center" g="$1">
        <AppIcon name="help-circle" size={36} color="#FAF6ED" />
        <Text color="$paperSoft" fs={10} fw="$7" ls="$1">{quiz.topic.toUpperCase()}</Text>
      </YStack>
      <YStack pos="absolute" r={14} b={10} items="flex-end">
        <Text color="$paperDeep" fs={9}>CÂU HỎI</Text>
        <Text color="$paperSoft" fs="$5" lh="$5" fw="$7">{quiz.questions.length}</Text>
      </YStack>
    </ZStack>
  );
}

export function QuizListScreen({
  onPlayQuizSet,
  onPlayEpisodeQuiz,
}: {
  onPlayQuizSet: (quiz: QuizSet) => void;
  onPlayEpisodeQuiz: (episode: PodcastEpisode) => void;
}): React.JSX.Element {
  const [topic, setTopic] = useState<QuizTopic>("Tất cả");
  const filtered = useMemo(() => (topic === "Tất cả" ? quizSets : quizSets.filter((quiz) => quiz.topic === topic)), [topic]);

  const episodeQuizzesQuery = useQuery({
    queryKey: ["podcast", "quizzes", "episodes"],
    queryFn: () => podcastApi.listEpisodeQuizzes(),
  });

  return (
    <ScreenScroll>
      <AppHeader rightIcon="search" onRight={() => undefined} />
      <YStack g="$1">
        <Text color="$bronzeDark" fs={10} fw="$7" ls="$1">HỌC BẰNG THỬ THÁCH</Text>
        <Text color="$ink" fs="$5" lh="$5" fw="$7">Chọn một bộ quiz để bắt đầu</Text>
        <Text color="$inkSoft" fs="$1" lh="$2">
          Làm bài trắc nghiệm theo từng tập podcast hoặc thử tài với các bộ câu hỏi chủ đề.
        </Text>
      </YStack>

      <YStack g="$2">
        <SectionHeader title="Quiz theo tập podcast" />
        {episodeQuizzesQuery.isPending ? (
          <YStack py="$3" items="center"><Text color="$inkSoft" fs="$1">Đang tìm các tập có quiz…</Text></YStack>
        ) : episodeQuizzesQuery.data && episodeQuizzesQuery.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack g="$2.5">
              {episodeQuizzesQuery.data.map((episode) => (
                <YStack
                  key={episode.id}
                  w={240}
                  onPress={() => onPlayEpisodeQuiz(episode)}
                  pressStyle={{ op: 0.8 }}
                >
                  <AppCard>
                    <ZStack h={135} w="100%">
                      <AppImage source={episode.image} w="100%" h={135} resizeMode="cover" rounded={0} />
                      <YStack pos="absolute" t="$1.5" l="$1.5" bg="$vermilion" px="$2" py="$0.5" rounded="$3">
                        <Text color="$paperSoft" fs={9} fw="$7">QUIZ TẬP</Text>
                      </YStack>
                    </ZStack>
                    <YStack p="$2.5" g="$1">
                      <Text color="$inkSoft" fs={10} numberOfLines={1}>{episode.seriesTitle} · Tập {episode.number}</Text>
                      <Text color="$ink" fs="$2" fw="$7" numberOfLines={2}>{episode.title}</Text>
                      <XStack items="center" justify="space-between" mt="$1">
                        <Text color="$vermilion" fs={11} fw="$7">Bắt đầu ôn tập</Text>
                        <AppIcon name="arrow-right" size={14} color="#B8322A" />
                      </XStack>
                    </YStack>
                  </AppCard>
                </YStack>
              ))}
            </XStack>
          </ScrollView>
        ) : null}
      </YStack>

      <YStack g="$2">
        <SectionHeader title="Thử tài lịch sử" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack g="$1.5">
            {topics.map((item) => (
              <Chip key={item} label={item === "Tất cả" ? "Tất cả chủ đề" : item} selected={topic === item} onPress={() => setTopic(item)} />
            ))}
          </XStack>
        </ScrollView>
      </YStack>

      <YStack g="$2">
        {filtered.map((quiz) => (
          <AppCard key={quiz.id} onPress={() => onPlayQuizSet(quiz)}>
            <QuizCover quiz={quiz} height={118} rounded={0} />
            <YStack p="$3" g="$1.5">
              <XStack items="center" justify="space-between">
                <YStack w="$4" h="$4" rounded="$4" bg="$paperDeep" items="center" justify="center">
                  <AppIcon name="layers" size={20} color="#B8322A" />
                </YStack>
                <XStack items="center" g="$1">
                  <AppIcon name="users" size={13} color="#5B4E44" />
                  <Text color="$inkSoft" fs={11}>{quiz.plays} lượt chơi</Text>
                </XStack>
              </XStack>
              <Text color="$ink" fs="$2" lh="$2" fw="$7">{quiz.title}</Text>
              <XStack items="center" g="$1.5">
                <AppIcon name="headphones" size={13} color="#5B4E44" />
                <Text f={1} color="$inkSoft" fs="$1" numberOfLines={1}>{quiz.seriesTitle}</Text>
              </XStack>
              <XStack items="center" justify="space-between" pt="$1.5" borderTopWidth={1} bc="$line">
                <Text color="$inkSoft" fs={11}>{quiz.questions.length} câu hỏi · {quiz.author}</Text>
                <AppIcon name="chevron-right" size={16} color="#B8322A" />
              </XStack>
            </YStack>
          </AppCard>
        ))}
      </YStack>
    </ScreenScroll>
  );
}

export function QuizIntroScreen({ quiz, onBack, onStart }: { quiz: QuizSet; onBack: () => void; onStart: () => void }): React.JSX.Element {
  return (
    <YStack f={1}>
      <AppHeader onBack={onBack} />
      <ScrollView f={1} showsVerticalScrollIndicator={false}>
        <YStack px="$3" pb="$3" g="$3">
          <QuizCover quiz={quiz} height={190} />
          <Text self="flex-start" color="$inkSoft" bg="$paperSoft" bw={1} bc="$line" px="$2" py="$0.5" rounded="$8" fs={11}>{quiz.topic}</Text>
          <Text color="$ink" fs="$5" lh="$5" fw="$7">{quiz.title}</Text>
          <Text color="$inkSoft" fs="$2" lh="$3">{quiz.description}</Text>
          <YStack g="$1.5">
            <XStack items="center" g="$1.5"><AppIcon name="grid" size={15} color="#5B4E44" /><Text color="$inkSoft" fs="$1">{quiz.questions.length} câu hỏi</Text></XStack>
            <XStack items="center" g="$1.5"><AppIcon name="clock" size={15} color="#5B4E44" /><Text color="$inkSoft" fs="$1">Khoảng {Math.ceil(quiz.questions.length * 0.5)} phút</Text></XStack>
            <XStack items="center" g="$1.5"><AppIcon name="headphones" size={15} color="#5B4E44" /><Text color="$inkSoft" fs="$1">{quiz.episodeTitle}</Text></XStack>
          </YStack>
        </YStack>
      </ScrollView>
      <YStack px="$3" py="$2"><PrimaryButton label="Bắt đầu chơi" onPress={onStart} /></YStack>
    </YStack>
  );
}

interface QuizPlayScreenProps {
  quiz: QuizSet;
  index: number;
  selectedId?: string;
  onSelect: (optionId: string) => void;
  onNext: () => void;
  onExit: () => void;
}

export function QuizPlayScreen({ quiz, index, selectedId, onSelect, onNext, onExit }: QuizPlayScreenProps): React.JSX.Element {
  const current = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;
  const isCorrect = selectedId === current.correctOptionId;

  return (
    <YStack f={1}>
      <AppHeader title="Thoát" onBack={onExit} />
      <ScrollView f={1} showsVerticalScrollIndicator={false}>
        <YStack px="$3" pb="$3" g="$3">
          <XStack items="center" justify="space-between" g="$2">
            <YStack f={1}>
              <Text color="$bronzeDark" fs={10} fw="$7" numberOfLines={1}>PHIẾU ÔN TẬP · {quiz.topic.toUpperCase()}</Text>
              <Text color="$ink" fs="$3" fw="$7">Câu hỏi {index + 1} <Text color="$inkSoft" fs="$1" fw="$5">trên {quiz.questions.length}</Text></Text>
            </YStack>
            <XStack items="center" g="$1" bg="$paperDeep" px="$2" py="$1" rounded="$8">
              <AppIcon name="clock" size={13} color="#5B4E44" />
              <Text color="$inkSoft" fs={11}>{current.timeLimit} giây</Text>
            </XStack>
          </XStack>
          <ProgressBar value={((index + 1) / quiz.questions.length) * 100} />
          <AppCard>
            <XStack p="$3" g="$2.5" items="flex-start">
              <Text color="$vermilion" fs="$5" lh="$5" fw="$7">{String(index + 1).padStart(2, "0")}</Text>
              <Text f={1} color="$ink" fs="$3" lh="$3" fw="$7">{current.text}</Text>
            </XStack>
          </AppCard>
          <YStack g="$1.5">
            {current.options.map((option, optionIndex) => {
              const correct = option.id === current.correctOptionId;
              const picked = option.id === selectedId;
              const state = selectedId ? (correct ? "correct" : picked ? "wrong" : "muted") : "idle";
              return (
                <Button
                  key={option.id}
                  unstyled
                  minH="$5"
                  px="$3"
                  py="$2"
                  fd="row"
                  items="center"
                  g="$2.5"
                  rounded="$5"
                  bg={state === "correct" ? CORRECT_BG : state === "wrong" ? WRONG_BG : "$paperSoft"}
                  bw={state === "correct" || state === "wrong" ? 1.5 : 1}
                  bc={state === "correct" ? CORRECT : state === "wrong" ? "$vermilion" : "$line"}
                  op={state === "muted" ? 0.55 : 1}
                  disabled={Boolean(selectedId)}
                  onPress={() => onSelect(option.id)}
                  pressStyle={{ op: 0.75 }}
                >
                  <YStack
                    w={28}
                    h={28}
                    rounded={8}
                    bg={state === "correct" ? CORRECT : state === "wrong" ? "$vermilion" : "$paperDeep"}
                    items="center"
                    justify="center"
                  >
                    <Text color={state === "correct" || state === "wrong" ? "$paperSoft" : "$inkSoft"} fs={12} fw="$7">
                      {answerLetters[optionIndex]}
                    </Text>
                  </YStack>
                  <Text f={1} color="$ink" fs="$2" fw={state === "idle" ? "$5" : "$7"}>{option.text}</Text>
                  {state === "correct" ? <AppIcon name="check-circle" size={20} color={CORRECT} /> : null}
                  {state === "wrong" ? <AppIcon name="x-circle" size={20} color="#B8322A" /> : null}
                </Button>
              );
            })}
          </YStack>
          {selectedId ? (
            <AppCard>
              <YStack p="$3" g="$1">
                <Text color={isCorrect ? CORRECT : "$vermilion"} fs="$2" fw="$7">{isCorrect ? "Chính xác!" : "Chưa đúng rồi"}</Text>
                <Text color="$inkSoft" fs="$1" lh="$2">{current.explanation}</Text>
              </YStack>
            </AppCard>
          ) : null}
        </YStack>
      </ScrollView>
      {selectedId ? (
        <YStack px="$3" py="$2">
          <PrimaryButton label={isLast ? "Xem kết quả" : "Câu tiếp theo"} onPress={onNext} />
        </YStack>
      ) : null}
    </YStack>
  );
}

export function QuizResultScreen({ quiz, score, onRetry, onClose }: { quiz: QuizSet; score: number; onRetry: () => void; onClose: () => void }): React.JSX.Element {
  const percent = Math.round((score / quiz.questions.length) * 100);
  return (
    <ScreenScroll>
      <AppHeader title="Kết quả quiz" />
      <YStack items="center" g="$1.5" pt="$3">
        <YStack w="$10" h="$10" rounded="$12" bg="$paperDeep" bw="$0.5" bc="$bronze" items="center" justify="center">
          <AppIcon name="award" size={42} color="#B58A3C" />
        </YStack>
        <Text color="$bronzeDark" fs={10} fw="$7" ls="$1">HOÀN THÀNH THỬ THÁCH</Text>
        <Text color="$vermilion" fs="$4" lh="$4" fw="$7" text="center">
          {percent >= 80 ? "Xuất sắc!" : percent >= 50 ? "Bạn làm khá tốt!" : "Thử lại để nhớ lâu hơn nhé!"}
        </Text>
        <Text color="$ink" fs="$7" lh="$7" fw="$7">
          {score}<Text color="$inkSoft" fs="$4" fw="$5">/{quiz.questions.length}</Text>
        </Text>
        <Text color="$inkSoft" fs="$1" text="center">
          Bạn trả lời đúng {percent}% số câu hỏi trong bộ “{quiz.title}”.
        </Text>
      </YStack>
      <XStack g="$2" mt="$2">
        <YStack f={1}><PrimaryButton label="Về danh sách" secondary onPress={onClose} /></YStack>
        <YStack f={1}><PrimaryButton label="Chơi lại" icon="rotate-ccw" onPress={onRetry} /></YStack>
      </XStack>
    </ScreenScroll>
  );
}

// -------------------------------------------------------------
// EPISODE QUIZ SCREEN (FLOW THẬT CỦA WEB CÓ POSTER 16:9 + API CHẤM)
// -------------------------------------------------------------

interface EpisodeQuizScreenProps {
  episode: PodcastEpisode;
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
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const quiz = quizQuery.data;
      if (!quiz) throw new Error("Chưa có dữ liệu quiz");
      const answerList = quiz.questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id],
      }));
      return podcastApi.attempt(quiz.id, answerList, idempotencyKey.current);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["podcast"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const quiz = quizQuery.data;
  const result: QuizAttemptResult | undefined = submitMutation.data;

  const retry = (): void => {
    setCurrentIndex(0);
    setAnswers({});
    idempotencyKey.current = createUuid();
    submitMutation.reset();
  };

  // Trạng thái tải hoặc lỗi
  if (quizQuery.isPending) {
    return (
      <YStack f={1} bg="$paper">
        <AppHeader title="Ôn tập sau khi nghe" onBack={onBack} />
        <YStack f={1} items="center" justify="center" p="$4" g="$2">
          <Text color="$inkSoft" fs="$1">Đang tải bộ câu hỏi…</Text>
        </YStack>
      </YStack>
    );
  }

  if (quizQuery.isError || !quiz || quiz.questions.length === 0) {
    return (
      <YStack f={1} bg="$paper">
        <AppHeader title="Ôn tập sau khi nghe" onBack={onBack} />
        <YStack f={1} items="center" justify="center" p="$4" g="$2">
          <AppIcon name="award" size={36} color="#B58A3C" />
          <Text color="$ink" fs="$3" fw="$7" text="center">Bộ câu hỏi đang được chuẩn bị</Text>
          <Text color="$inkSoft" fs="$1" text="center">
            Tập này hiện chưa có bài trắc nghiệm. Bạn có thể quay lại sau hoặc thử các bộ quiz khác.
          </Text>
          <YStack mt="$2">
            <PrimaryButton label="Quay lại" secondary onPress={onBack} />
          </YStack>
        </YStack>
      </YStack>
    );
  }

  // Màn hình kết quả sau khi nộp bài
  if (result) {
    const correctCount = result.answers.filter((item) => item.isCorrect).length;
    return (
      <YStack f={1} bg="$paper">
        <AppHeader title="Kết quả bài quiz" onBack={onBack} />
        <ScrollView f={1} showsVerticalScrollIndicator={false}>
          <YStack px="$3" pb="$4" g="$3">
            <AppCard>
              <YStack p="$3" g="$2">
                <XStack items="center" g="$3">
                  <YStack borderLeftWidth={4} bc="$vermilion" pl="$3">
                    <Text color="$ink" fs={38} fw="$7" lh={38}>{result.scorePercent}%</Text>
                    <Text color="$inkSoft" fs={11} mt="$0.5">
                      {correctCount}/{result.answers.length} câu đúng
                    </Text>
                  </YStack>
                  <YStack f={1} g="$0.5">
                    <XStack items="center" g="$1">
                      <AppIcon name={result.isPassed ? "award" : "help-circle"} size={18} color="#B58A3C" />
                      <Text color="$bronzeDark" fs={11} fw="$7">
                        {result.isPassed ? "ĐÃ VƯỢT QUA" : "CHƯA ĐẠT ĐIỂM QUA"}
                      </Text>
                    </XStack>
                    <Text color="$ink" fs="$3" fw="$7">
                      {result.isPassed ? "Chúc mừng bạn!" : "Bạn có thể thử lại"}
                    </Text>
                    <Text color="$inkSoft" fs={11}>
                      +{result.xpAwarded} XP · Tổng {result.totalXp} XP
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </AppCard>

            <XStack items="center" justify="space-between">
              <Text color="$ink" fs="$3" fw="$7">Đáp án và lời giải</Text>
              <Button unstyled px="$2.5" py="$1" bg="$paperDeep" rounded="$4" onPress={retry}>
                <Text color="$ink" fs={11} fw="$6">Làm lại</Text>
              </Button>
            </XStack>

            <YStack g="$2">
              {result.answers.map((answer, index) => {
                const question = quiz.questions.find((q) => q.id === answer.questionId);
                const selectedOption = question?.options.find((o) => o.id === answer.selectedOptionId);
                const correctOption = question?.options.find((o) => o.id === answer.correctOptionId);

                return (
                  <AppCard key={answer.questionId}>
                    <YStack p="$3" g="$1.5">
                      <XStack items="flex-start" g="$2">
                        <AppIcon
                          name={answer.isCorrect ? "check-circle" : "x-circle"}
                          size={18}
                          color={answer.isCorrect ? CORRECT : "#B8322A"}
                        />
                        <YStack f={1} minW={0} g="$1">
                          <Text color="$ink" fs="$2" fw="$7">
                            {index + 1}. {question?.text}
                          </Text>
                          <Text color="$inkSoft" fs="$1">
                            Bạn chọn:{" "}
                            <Text color={answer.isCorrect ? CORRECT : "$vermilion"} fw="$7">
                              {selectedOption?.label}. {selectedOption?.text}
                            </Text>
                          </Text>
                          {!answer.isCorrect && correctOption ? (
                            <Text color="$inkSoft" fs="$1">
                              Đáp án đúng:{" "}
                              <Text color="$ink" fw="$7">
                                {correctOption.label}. {correctOption.text}
                              </Text>
                            </Text>
                          ) : null}
                          {answer.explanation ? (
                            <YStack borderLeftWidth={2} bc="$bronze" pl="$2" mt="$1">
                              <Text color="$inkSoft" fs={11} lh={16}>
                                {answer.explanation}
                              </Text>
                            </YStack>
                          ) : null}
                        </YStack>
                      </XStack>
                    </YStack>
                  </AppCard>
                );
              })}
            </YStack>

            <XStack g="$2" mt="$2">
              <YStack f={1}><PrimaryButton label="Quay lại" secondary onPress={onBack} /></YStack>
              <YStack f={1}><PrimaryButton label="Làm lại" icon="rotate-ccw" onPress={retry} /></YStack>
            </XStack>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // Màn hình trả lời từng câu hỏi
  const currentQuestion = quiz.questions[currentIndex];
  const selectedOptionId = answers[currentQuestion.id];
  const isLastQuestion = currentIndex === quiz.questions.length - 1;
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  return (
    <YStack f={1} bg="$paper">
      <AppHeader title="Ôn tập sau khi nghe" onBack={onBack} />
      <ScrollView f={1} showsVerticalScrollIndicator={false}>
        <YStack px="$3" pb="$4" g="$2.5">
          {/* POSTER 16:9 CỦA TẬP NHƯ TRÊN WEB */}
          <AppCard>
            <ZStack h={140} w="100%">
              <AppImage source={episode.image} w="100%" h={140} resizeMode="cover" rounded={0} />
              <YStack pos="absolute" l="$2.5" b="$2.5" r="$2.5" g="$0.5">
                <Text color="$paperSoft" fs={9} fw="$7" bg="$bronzeDark" self="flex-start" px="$1.5" py="$0.5" rounded="$2">
                  {episode.seriesTitle.toUpperCase()}
                </Text>
                <Text color="$paperSoft" fs="$2" fw="$7" numberOfLines={1}>{episode.title}</Text>
              </YStack>
            </ZStack>
          </AppCard>

          <XStack items="center" justify="space-between">
            <Text color="$inkSoft" fs={11} fw="$6">
              Câu {currentIndex + 1} / {quiz.questions.length}
            </Text>
            <Text color="$inkSoft" fs={11}>{progressPercent}%</Text>
          </XStack>
          <ProgressBar value={progressPercent} />

          <Text self="flex-start" color="$inkSoft" bg="$paperDeep" px="$2" py="$0.5" rounded="$4" fs={10} fw="$6">
            CHỌN MỘT ĐÁP ÁN
          </Text>

          <Text color="$ink" fs="$4" lh={24} fw="$7">
            {currentQuestion.text}
          </Text>

          <YStack g="$2" mt="$1">
            {currentQuestion.options.map((option) => {
              const selected = selectedOptionId === option.id;
              return (
                <Button
                  key={option.id}
                  unstyled
                  minH={54}
                  px="$3"
                  py="$2.5"
                  fd="row"
                  items="center"
                  g="$2.5"
                  rounded="$5"
                  bg={selected ? "$paperDeep" : "$paperSoft"}
                  bw={selected ? 1.5 : 1}
                  bc={selected ? "$vermilion" : "$line"}
                  onPress={() => {
                    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option.id }));
                    idempotencyKey.current = createUuid();
                  }}
                  pressStyle={{ op: 0.8 }}
                >
                  <YStack
                    w={30}
                    h={30}
                    rounded={8}
                    bg={selected ? "$vermilion" : "$paper"}
                    bw={1}
                    bc={selected ? "$vermilion" : "$line"}
                    items="center"
                    justify="center"
                  >
                    <Text color={selected ? "$paperSoft" : "$inkSoft"} fs={12} fw="$7">
                      {option.label}
                    </Text>
                  </YStack>
                  <Text f={1} color="$ink" fs="$2" fw={selected ? "$7" : "$5"}>
                    {option.text}
                  </Text>
                  {selected ? <AppIcon name="check" size={18} color="#B8322A" /> : null}
                </Button>
              );
            })}
          </YStack>

          {submitMutation.isError ? (
            <Text color="$vermilion" fs={11} mt="$1">
              Chưa gửi được bài thi. Vui lòng kiểm tra kết nối mạng và thử lại.
            </Text>
          ) : null}
        </YStack>
      </ScrollView>

      {/* BOTTOM TRANSPORT: CÂU TRƯỚC / CÂU TIẾP THEO / NỘP BÀI / ĐĂNG NHẬP */}
      <XStack px="$3" py="$2.5" bg="$paperSoft" borderTopWidth={1} bc="$line" items="center" justify="space-between" g="$2">
        <Button
          unstyled
          h="$4"
          px="$3"
          fd="row"
          items="center"
          g="$1.5"
          disabled={currentIndex === 0 || submitMutation.isPending}
          op={currentIndex === 0 ? 0.4 : 1}
          onPress={() => setCurrentIndex((val) => Math.max(0, val - 1))}
        >
          <AppIcon name="arrow-left" size={16} />
          <Text color="$ink" fs="$1" fw="$6">Câu trước</Text>
        </Button>

        {!isLastQuestion ? (
          <PrimaryButton
            label="Câu tiếp theo"
            disabled={!selectedOptionId}
            onPress={() => setCurrentIndex((val) => Math.min(quiz.questions.length - 1, val + 1))}
          />
        ) : signedIn ? (
          <PrimaryButton
            label={submitMutation.isPending ? "Đang chấm bài…" : "Nộp bài"}
            disabled={!selectedOptionId || submitMutation.isPending}
            onPress={() => submitMutation.mutate()}
          />
        ) : (
          <PrimaryButton
            label="Đăng nhập để nộp bài"
            icon="lock"
            onPress={onRequireAuth}
          />
        )}
      </XStack>
    </YStack>
  );
}
