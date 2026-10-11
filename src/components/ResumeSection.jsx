import { useRef, useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { addUser } from "../utils/userSlice";
import { BASE_URL } from "../utils/constants";
import { FaFilePdf, FaUpload } from "react-icons/fa";
import { getApiErrorMessage } from "../utils/apiErrors";

const MAX_SIZE_MB = 5;

const ResumeSection = ({ user }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const { resumeUrl, resumeFileName } = user || {};

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) {
      toast.error("Only PDF files are allowed");
      e.target.value = "";
      return;
    }
    if (!file.size || file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Resume must be smaller than ${MAX_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    let uploadStage = "permission";
    try {
      // 1. Ask our backend for a signed payload (no network call to Cloudinary happens here)
      const { data: sig } = await axios.get(BASE_URL + "/profile/resume/upload-signature", {
        withCredentials: true,
      });

      // 2. Upload the file straight from the browser to Cloudinary
      uploadStage = "upload";
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("api_key", sig.apiKey);
      cloudForm.append("timestamp", sig.timestamp);
      cloudForm.append("signature", sig.signature);
      cloudForm.append("folder", sig.folder);
      cloudForm.append("public_id", sig.publicId);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`,
        cloudForm
      );

      // Save first; the backend retires the old file and search data after success.
      uploadStage = "save";
      const res = await axios.patch(
        BASE_URL + "/profile/resume",
        {
          resumeUrl: cloudRes.data.secure_url,
          resumeFileName: file.name,
          resumePublicId: cloudRes.data.public_id,
        },
        { withCredentials: true }
      );
      dispatch(addUser(res.data.data));
      window.dispatchEvent(new CustomEvent("devtinder:resume-changed", { detail: { candidateId: user._id } }));
      toast.success(res.data.message);
    } catch (err) {
      const fallback = uploadStage === "save"
        ? "Your PDF uploaded, but saving it failed. Refresh the page and try again."
        : "Could not upload your resume. Check your connection and try again.";
      toast.error(getApiErrorMessage(err, fallback));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeResume = async () => {
    setIsUploading(true);
    try {
      const res = await axios.delete(BASE_URL + "/profile/resume", { withCredentials: true });
      dispatch(addUser(res.data.data));
      window.dispatchEvent(new CustomEvent("devtinder:resume-changed", { detail: { candidateId: user._id } }));
      toast.success(res.data.message);
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not remove your resume. Please try again.")); }
    finally { setIsUploading(false); }
  };

  return (
    <fieldset className="fieldset">
      <p>Resume</p>
      <div className="bg-[#1a1a1a] rounded-md border border-gray-800 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FaFilePdf className="text-red-500 shrink-0" size={20} />
          {resumeFileName ? (
            <a
              href={resumeUrl}
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
        {resumeFileName && <button type="button" onClick={removeResume} disabled={isUploading}
          className="btn btn-xs btn-ghost text-red-400 shrink-0">Remove</button>}
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
