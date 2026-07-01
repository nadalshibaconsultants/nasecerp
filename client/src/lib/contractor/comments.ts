export type SubmittalComment = {
  id: string;
  submittalId: string;
  authorUserId: string;
  authorDisplay: string;
  authorRole: "contractor" | "consultant";
  body: string;
  createdAt: string;
};
