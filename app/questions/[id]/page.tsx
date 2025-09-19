import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnswerComposer } from "@/components/questions/answer-composer";
import { ReviewComposer } from "@/components/questions/review-composer";

// ????????????????????????????
export default async function QuestionDetailPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      student: true,
      assignedTo: true,
      answers: {
        include: {
          responder: true,
          reviews: true
        }
      },
      reviews: {
        include: {
          rater: true
        }
      }
    }
  });
  if (!question) {
    redirect("/dashboard");
  }

  const primaryAnswer = question.answers[0] ?? null;
  const studentNeedsReview =
    currentUser.role === "student" &&
    question.studentId === currentUser.id &&
    primaryAnswer &&
    !question.reviews.find((r) => r.raterId === currentUser.id);

  const canAnswer =
    currentUser.role === "responder" &&
    (question.status === "queued" || question.assignedToId === currentUser.id);

  async function claimQuestion() {
    "use server";
    if (!currentUser || currentUser.role !== "responder") return;
    await prisma.question.update({
      where: { id: params.id },
      data: {
        status: "assigned",
        assignedToId: currentUser.id,
        assignedAt: new Date()
      }
    });
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12" data-testid="question-detail">
      <Card title={question.title}>
        <div className="flex flex-wrap items-center gap-2" data-testid="question-meta">
          <Badge data-testid="question-status">??: {question.status}</Badge>
          <Badge data-testid="question-chars">???: {question.charCount}</Badge>
          {question.tags.map((tag) => (
            <Badge key={tag} data-testid="question-tag">
              {tag}
            </Badge>
          ))}
        </div>
        <article className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700" data-testid="question-body">
          {question.body}
        </article>
        <p className="text-xs text-slate-500" data-testid="question-author">???: {question.student.name}</p>
        {question.aiFeedback && (
          <div className="mt-4 space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-500" data-testid="question-aifeedback">
            <p>AI????: {question.aiCheckPassed ? "??" : "?????"}</p>
            <pre>{question.aiFeedback}</pre>
          </div>
        )}
      </Card>

      {currentUser.role === "responder" && question.status === "queued" && (
        <form action={claimQuestion} className="self-start" data-testid="question-claim-form">
          <Button type="submit" data-testid="question-claim-button">
            ?????????
          </Button>
        </form>
      )}

      {canAnswer && (
        <Card title="?????" data-testid="question-answer-card">
          <AnswerComposer questionId={question.id} />
        </Card>
      )}

      {primaryAnswer && (
        <Card title="??" data-testid="question-answer">
          <p className="text-sm text-slate-600" data-testid="question-answer-author">
            ???: {primaryAnswer.responder.name}
          </p>
          <article className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700" data-testid="question-answer-body">
            {primaryAnswer.body}
          </article>
          {primaryAnswer.reviews.length > 0 && (
            <div className="mt-4 space-y-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700" data-testid="question-answer-review">
              <p>???????: ?{primaryAnswer.reviews[0].stars}</p>
              {primaryAnswer.reviews[0].comment && <p>{primaryAnswer.reviews[0].comment}</p>}
            </div>
          )}
        </Card>
      )}

      {studentNeedsReview && primaryAnswer && (
        <Card title="???????????" data-testid="question-review-card">
          <ReviewComposer questionId={question.id} answerId={primaryAnswer.id} />
        </Card>
      )}
    </main>
  );
}
