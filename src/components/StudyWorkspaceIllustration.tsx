import {
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";

const StudyWorkspaceIllustration = () => (
  <div
    role="img"
    aria-label="Books and course notes coming together inside a StudyUp learning workspace"
    className="relative isolate mx-auto aspect-[5/4] w-full max-w-[760px]"
  >
    <div
      aria-hidden="true"
      className="absolute inset-[10%_7%_12%] rounded-[3rem] bg-gradient-to-br from-blue-300/45 via-violet-300/45 to-fuchsia-300/45 blur-3xl"
    />

    <div aria-hidden="true" className="absolute left-[2%] top-[13%] hidden -rotate-12 sm:block">
      <div className="w-32 rounded-xl border border-blue-200 bg-white/95 p-3 shadow-xl shadow-blue-900/10 lg:w-36">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-blue-700">
          <FileText className="size-4" /> Lecture notes
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-slate-200" />
          <div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
          <div className="h-1.5 w-2/3 rounded-full bg-blue-100" />
        </div>
      </div>
    </div>

    <div aria-hidden="true" className="absolute right-[1%] top-[8%] hidden rotate-[10deg] md:block">
      <div className="w-32 rounded-xl border border-fuchsia-200 bg-white/95 p-3 shadow-xl shadow-fuchsia-900/10 lg:w-36">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-fuchsia-700">
          <CalendarDays className="size-4" /> Assignments
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-violet-500" />
            <div className="h-1.5 flex-1 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3.5 rounded-full border border-slate-300" />
            <div className="h-1.5 w-3/5 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </div>

    <div aria-hidden="true" className="absolute bottom-[13%] left-[1%] hidden -rotate-6 md:block">
      <div className="h-6 w-36 rounded-r-md border border-blue-300 bg-blue-500 shadow-md" />
      <div className="ml-2 h-7 w-40 rounded-r-md border border-violet-300 bg-violet-500 shadow-md" />
      <div className="ml-1 flex h-8 w-36 items-center gap-2 rounded-r-md border border-fuchsia-300 bg-fuchsia-500 px-3 text-xs font-semibold text-white shadow-md">
        <BookOpen className="size-4" /> Study library
      </div>
    </div>

    <div aria-hidden="true" className="absolute right-[4%] top-[31%] hidden rotate-6 lg:block">
      <div className="rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 shadow-lg shadow-violet-900/10">
        <Sparkles className="mr-1.5 inline size-3.5" /> Ask your materials
      </div>
    </div>

    <div className="absolute inset-x-[5%] bottom-[7%] sm:inset-x-[10%] sm:bottom-[8%]">
      <div className="relative z-10 rounded-[1rem] border-[5px] border-slate-800 bg-slate-900 p-1.5 shadow-2xl shadow-violet-950/25 sm:rounded-[1.4rem] sm:border-[7px] sm:p-2">
        <div className="flex aspect-[16/10] flex-col overflow-hidden rounded-[0.55rem] bg-white sm:rounded-xl">
          <div className="flex h-8 items-center justify-between border-b border-violet-100 bg-white px-3 sm:h-11 sm:px-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="grid size-5 place-items-center rounded-md bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 sm:size-7 sm:rounded-lg">
                <Brain className="size-3 text-white sm:size-4" />
              </span>
              <span className="text-[9px] font-bold tracking-tight text-slate-900 sm:text-xs">StudyUp</span>
            </div>
            <div className="flex gap-1">
              <span className="size-1.5 rounded-full bg-blue-300 sm:size-2" />
              <span className="size-1.5 rounded-full bg-violet-300 sm:size-2" />
              <span className="size-1.5 rounded-full bg-fuchsia-300 sm:size-2" />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[2.5rem_1fr] sm:grid-cols-[4.5rem_1fr]">
            <div className="border-r border-violet-100 bg-violet-50/70 p-1.5 sm:p-2.5">
              <div className="mb-2 h-1.5 w-3/4 rounded-full bg-violet-300 sm:h-2" />
              <div className="space-y-1.5 sm:space-y-2">
                <div className="h-1.5 rounded-full bg-violet-200 sm:h-2" />
                <div className="h-1.5 w-4/5 rounded-full bg-slate-200 sm:h-2" />
                <div className="h-1.5 w-3/5 rounded-full bg-slate-200 sm:h-2" />
              </div>
            </div>

            <div className="min-w-0 p-2.5 sm:p-4">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p className="text-[8px] font-semibold text-violet-600 sm:text-[10px]">LEARNING WORKSPACE</p>
                  <p className="text-[11px] font-bold text-slate-900 sm:text-base">Everything in context</p>
                </div>
                <span className="rounded-md bg-violet-100 px-1.5 py-1 text-[7px] font-semibold text-violet-700 sm:rounded-lg sm:px-2 sm:text-[9px]">
                  AI Tutor
                </span>
              </div>

              <div className="grid grid-cols-[0.9fr_1.1fr] gap-2 sm:gap-3">
                <div className="space-y-2 sm:space-y-3">
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-2 sm:rounded-xl sm:p-3">
                    <div className="mb-1.5 flex items-center gap-1 text-[8px] font-semibold text-blue-700 sm:text-[10px]">
                      <BookOpen className="size-2.5 sm:size-3.5" /> Courses
                    </div>
                    <div className="h-1.5 w-4/5 rounded-full bg-blue-200 sm:h-2" />
                  </div>
                  <div className="rounded-md border border-fuchsia-100 bg-fuchsia-50 p-2 sm:rounded-xl sm:p-3">
                    <div className="mb-1.5 flex items-center gap-1 text-[8px] font-semibold text-fuchsia-700 sm:text-[10px]">
                      <FileText className="size-2.5 sm:size-3.5" /> Materials
                    </div>
                    <div className="h-1.5 w-2/3 rounded-full bg-fuchsia-200 sm:h-2" />
                  </div>
                </div>

                <div className="rounded-md border border-violet-100 bg-white p-2 shadow-sm sm:rounded-xl sm:p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[8px] font-semibold text-violet-700 sm:text-[10px]">
                    <Sparkles className="size-2.5 sm:size-3.5" /> Contextual help
                  </div>
                  <div className="rounded-md bg-violet-50 p-1.5 text-[7px] leading-relaxed text-slate-600 sm:rounded-lg sm:p-2.5 sm:text-[9px]">
                    Your notes, courses, and deadlines are connected here.
                  </div>
                  <div className="mt-2 ml-auto h-5 w-3/5 rounded-md bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 sm:h-7 sm:rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="relative z-0 mx-auto h-3 w-[108%] -translate-x-[4%] rounded-b-[50%] bg-gradient-to-b from-slate-500 to-slate-700 shadow-xl sm:h-5">
        <div className="mx-auto h-1 w-1/5 rounded-b-full bg-slate-400 sm:h-1.5" />
      </div>
    </div>

    <div aria-hidden="true" className="absolute bottom-[4%] left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-full bg-slate-900/15 blur-xl" />
  </div>
);

export default StudyWorkspaceIllustration;
