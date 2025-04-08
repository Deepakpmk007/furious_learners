"use client";

import Nav from "@/app/components/Nav";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Footer from "@/app/components/footer";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function CourseVideoPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const [videoTitle, setVideoTitle] = useState("Introduction");

  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [mailStatus, setMailStatus] = useState("");

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/course?id=${id}`);
        const data = await res.json();
        setCourse(data.data[0]);
        setUrl(data.data[0].modules[0].youtubeUrl);
        setVideoTitle(data.data[0].modules[0].title);
      } catch (err) {
        setError("Something went wrong while fetching course.");
      }
    };
    fetchCourse();
  }, [id]);

  const handleSendMail = async () => {
    setSending(true);
    setMailStatus("");

    const payload = {
      instructorEmail: course.instructorEmail,
      courseTitle: course.title,
      studentEmail: session?.user?.email || "anonymous@student.com",
      message,
    };

    try {
      const res = await fetch("/api/sendMail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setMailStatus(data.message);
      setSending(false);
      setMessage("");
      setShowForm(false);
    } catch (err) {
      setMailStatus("Failed to send message.");
      setSending(false);
      console.error("Mail Error:", err);
    }
  };
  const generateCertificate = async () => {
    const existingPdfBytes = await fetch("/LMS.pdf").then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const { width, height } = firstPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    firstPage.drawText(session?.user?.name, {
      x: 360,
      y: height - 310,
      size: 35,
      font,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(course.title, {
      x: 360,
      y: height - 362.5,
      size: 16,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session?.user?.name}_certificate.pdf`;
    a.click();
  };

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center text-red-600 text-lg md:text-xl">
        {error}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex justify-center items-center text-lg md:text-xl">
        Loading course...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-teal-50 to-white text-gray-800">
      <Nav />

      <main className="flex flex-col lg:flex-row gap-6 px-4 py-8 sm:px-6 lg:px-12">
        <section className="flex-1 flex flex-col gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">{course.title}</h1>
          <h2 className="text-lg text-gray-600 font-medium">
            Lecture: {videoTitle}
          </h2>

          <div className="w-full aspect-video rounded-xl shadow-lg overflow-hidden">
            <iframe
              className="w-full h-full"
              src={url}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="mt-4 w-fit px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Send Mail to Instructor
          </button>

          {mailStatus && (
            <p className="text-sm mt-2 text-blue-600 font-medium">
              {mailStatus}
            </p>
          )}
        </section>

        <aside className="w-full lg:w-[30%] max-h-[70vh] bg-white rounded-xl shadow-lg p-4 overflow-y-auto">
          <h3 className="text-xl sm:text-2xl font-semibold mb-4">
            Course Contents
          </h3>
          <ul className="space-y-3">
            {course.modules?.map((mod, index) => (
              <li
                key={index}
                className="p-3 bg-teal-50 hover:bg-teal-100 text-gray-800 rounded-lg shadow-sm transition-all cursor-pointer"
                onClick={() => {
                  setUrl(mod.youtubeUrl);
                  setVideoTitle(mod.title);
                }}
              >
                {mod.title}
              </li>
            ))}
          </ul>
          <button
            className="mt-4 w-fit px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            onClick={generateCertificate}
          >
            Get certificate
          </button>
        </aside>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-2">Send a message</h2>
            <textarea
              rows={5}
              className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:outline-teal-500"
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMail}
                disabled={sending}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
