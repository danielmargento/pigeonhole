import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const page = req.nextUrl.searchParams.get("page");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch material row
  const { data: material } = await supabase
    .from("course_materials")
    .select("storage_path, course_id, file_type")
    .eq("id", id)
    .single();

  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the user has access: must be course owner or enrolled student
  const { data: course } = await supabase
    .from("courses")
    .select("owner_id")
    .eq("id", material.course_id)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (course.owner_id !== user.id) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", material.course_id)
      .eq("student_id", user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedData, error: signError } = await supabase.storage
    .from("course-materials")
    .createSignedUrl(material.storage_path, 3600);

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate URL" },
      { status: 500 }
    );
  }

  // Append #page=N for PDFs
  let redirectUrl = signedData.signedUrl;
  if (material.file_type === "pdf" && page) {
    redirectUrl += `#page=${page}`;
  }

  return NextResponse.redirect(redirectUrl, 302);
}
