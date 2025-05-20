"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import SendLetterModal from "../BusinessLetters/SubmitLetter";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast, Toaster } from "sonner";

export const Contact = () => {
  // ✅ HOOKS AT THE TOP
  const getAdminEmails = useMutation(api.users.getAdminEmails);
  const sendEmail = useAction(api.sendEmail.sendEmail);

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, subject, phone, message } = formData;

    if (!name || !email || !subject || !message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const adminEmails = await getAdminEmails();
      const htmlContent = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `;

      await Promise.all(
        adminEmails.map((to: string) =>
          sendEmail({ to, subject: `[Contact] ${subject}`, html: htmlContent })
        )
      );

      toast.success("Message sent successfully!");
      setFormData({ name: "", email: "", subject: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message.");
    }
  };
  return (
    <>
      {/* <!-- ===== Contact Start ===== --> */}
      <section id="support" className="px-4 md:px-8 2xl:px-0">
      {/* ==== Banner Section ==== */}
<div className="bg-gray-100 py-10 px-6 rounded-xl shadow-sm mb-10 border border-gray-200">
  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        📄 Have a letter to send to PEBEC?
      </h2>
      <p className="text-gray-600 text-sm md:text-base max-w-xl">
        Submit your official business letter with ease and receive a timely acknowledgment from the Council.
      </p>
    </div>
    <Button
      onClick={() => setOpenModal(true)}
      className="text-white bg-black hover:bg-green-800 px-6 py-6 text-base md:text-lg rounded-md"
    >
    Send Us a Letter
    </Button>
  </div>
</div>

        <div className="relative mx-auto max-w-c-1390 px-7.5 pt-10 lg:px-15 lg:pt-15 xl:px-20 xl:pt-20">
          <div className="absolute left-0 top-0 -z-1 h-2/3 w-full rounded-lg bg-gradient-to-t from-transparent to-[#dee7ff47] dark:bg-gradient-to-t dark:to-[#252A42]"></div>
          <div className="absolute bottom-[-255px] left-0 -z-1 h-full w-full">
            <Image
              src="./images/shape/shape-dotted-light.svg"
              alt="Dotted"
              className="dark:hidden"
              fill
            />
            <Image
              src="./images/shape/shape-dotted-dark.svg"
              alt="Dotted"
              className="hidden dark:block"
              fill
            />
          </div>

          <div className="flex flex-col-reverse flex-wrap gap-8 md:flex-row md:flex-nowrap md:justify-between xl:gap-20">
            <motion.div
              variants={{
                hidden: {
                  opacity: 0,
                  y: -20,
                },

                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_top w-full rounded-lg bg-white p-7.5 shadow-solid-8 dark:border dark:border-strokedark dark:bg-black md:w-3/5 lg:w-3/4 xl:p-15"
            >
              <h2 className="mb-15 text-3xl font-semibold text-black dark:text-white xl:text-sectiontitle2">
                Send a message
              </h2>

              <form onSubmit={handleSubmit}>

                <div className="mb-7.5 flex flex-col gap-7.5 lg:flex-row lg:justify-between lg:gap-14">
                  <input
                              name="name"

                    type="text"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border-b border-stroke bg-transparent pb-3.5 focus:border-waterloo focus:placeholder:text-black focus-visible:outline-none dark:border-strokedark dark:focus:border-manatee dark:focus:placeholder:text-white lg:w-1/2"
                  />

                  <input
                              name="email"

                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border-b border-stroke bg-transparent pb-3.5 focus:border-waterloo focus:placeholder:text-black focus-visible:outline-none dark:border-strokedark dark:focus:border-manatee dark:focus:placeholder:text-white lg:w-1/2"
                  />
                </div>

                <div className="mb-12.5 flex flex-col gap-7.5 lg:flex-row lg:justify-between lg:gap-14">
                  <input
                              name="subject"

                    type="text"
                    placeholder="Subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full border-b border-stroke bg-transparent pb-3.5 focus:border-waterloo focus:placeholder:text-black focus-visible:outline-none dark:border-strokedark dark:focus:border-manatee dark:focus:placeholder:text-white lg:w-1/2"
                  />

                  <input
                              name="phone"

                    type="text"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border-b border-stroke bg-transparent pb-3.5 focus:border-waterloo focus:placeholder:text-black focus-visible:outline-none dark:border-strokedark dark:focus:border-manatee dark:focus:placeholder:text-white lg:w-1/2"
                  />
                </div>

                <div className="mb-11.5 flex">
                  <textarea
                              name="message"

                    placeholder="Message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border-b border-stroke bg-transparent focus:border-waterloo focus:placeholder:text-black focus-visible:outline-none dark:border-strokedark dark:focus:border-manatee dark:focus:placeholder:text-white"
                  ></textarea>
                </div>

                <div className="flex flex-wrap gap-4 xl:justify-between ">
                <label htmlFor="default-checkbox" className="flex items-start cursor-pointer gap-3">
  <input
    id="default-checkbox"
    type="checkbox"
    className="peer sr-only"
    checked={agreedToTerms}
    onChange={(e) => setAgreedToTerms(e.target.checked)}
  />
  <span className="mt-1 border border-gray-300 bg-gray-100 text-blue-600 dark:border-gray-600 dark:bg-gray-700 flex h-5 w-5 items-center justify-center rounded peer-checked:bg-primary">
    <svg
      className="opacity-0 peer-checked:opacity-100"
      width="10"
      height="8"
      viewBox="0 0 10 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.70704 0.792787...Z"
        fill="white"
      />
    </svg>
  </span>
  <span className="text-sm max-w-[425px] text-gray-700 dark:text-white">
    By clicking Checkbox, you agree to use our “Form” terms and consent to cookie usage in browser.
  </span>
</label>


                  <button
  type="submit"
  aria-label="send message"
  className={`inline-flex items-center gap-2.5 rounded-full px-6 py-3 font-medium text-white duration-300 ease-in-out ${
    agreedToTerms ? "bg-black hover:bg-blackho dark:bg-btndark" : "bg-gray-400 cursor-not-allowed"
  }`}
  disabled={!agreedToTerms}
>
  Send Message
  <svg
    className="fill-white"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.4767 6.16664L6.00668 1.69664L7.18501 0.518311L13.6667 6.99998L7.18501 13.4816L6.00668 12.3033L10.4767 7.83331H0.333344V6.16664H10.4767Z"
      fill=""
    />
  </svg>
</button>

                </div>
              </form>
            </motion.div>

            <motion.div
              variants={{
                hidden: {
                  opacity: 0,
                  y: -20,
                },

                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 2, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_top w-full md:w-2/5 md:p-7.5 lg:w-[26%] xl:pt-15"
            >
              <h2 className="mb-12.5 text-3xl font-semibold text-black dark:text-white xl:text-sectiontitle2">
                Find us
              </h2>

              <div className="5 mb-7">
                <h3 className="mb-4 text-metatitle3 font-medium text-black dark:text-white">
                  Our Loaction
                </h3>
                <p>5th Floor, Total House 1, Plot 247 Herbert Macaulay Way, Central Business District (Opposite NNPC Towers), Abuja, FCT

</p>
              </div>
              <div className="5 mb-7">
                <h3 className="mb-4 text-metatitle3 font-medium text-black dark:text-white">
                  Email Address
                </h3>
                <p>
                  <a href="#">info@pebec.gov.ng</a>
                </p>
              </div>
              <div>
                <h4 className="mb-4 text-metatitle3 font-medium text-black dark:text-white">
                  Phone Number
                </h4>
                <p>
                  <a href="#">+234 807 507 9164

</a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
        <SendLetterModal open={openModal} setOpen={setOpenModal} />
<Toaster/>
      </section>
      {/* <!-- ===== Contact End ===== --> */}
    </>
  );
};

export default Contact;
