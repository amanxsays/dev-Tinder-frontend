import { useRef, useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { addUser } from "../utils/userSlice";
import { BASE_URL } from "../utils/constants";
import { FaFilePdf, FaUpload } from "react-icons/fa";

const MAX_SIZE_MB = 5;

const ResumeSection = ({ user }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const { resumeUrl, resumeFileName } = user || {};

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Resume must be smaller than ${MAX_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    setIsUploading(true);
    try {
      const res = await axios.post(BASE_URL + "/profile/resume/upload", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(addUser(res.data.data));
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data || "Failed to upload resume");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <fieldset className="fieldset">
      <p>Resume</p>
      <div className="bg-[#1a1a1a] rounded-md border border-gray-800 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FaFilePdf className="text-red-500 shrink-0" size={20} />
          {resumeFileName ? (
            <a
              href={`${BASE_URL}${resumeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-300 truncate hover:text-blue-400 hover:underline"
              title={resumeFileName}
            >
              {resumeFileName}
            </a>
          ) : (
            <span className="text-xs text-gray-500 italic">No resume uploaded</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="btn btn-xs btn-outline border-blue-600 text-blue-400 shrink-0"
        >
          {isUploading ? (
            <span className="loading loading-spinner loading-xs text-blue-500"></span>
          ) : (
            <>
              <FaUpload className="text-[10px]" />
              {resumeFileName ? "Replace" : "Upload"}
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </fieldset>
  );
};

export default ResumeSection;
