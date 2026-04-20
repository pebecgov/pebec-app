// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import Link from "next/link";
import Image from "next/image";

export default function ConsultingFirmsSelectionAdvertorialPage() {
  const noticeText = `FEDERAL REPUBLIC OF NIGERIA





FEDERAL MINISTRY OF FINANCE
STATES ACTION ON BUSINESS ENABLING REFORMS (SABER) PROGRAM
(WORLD BANK ASSISTED)
DEPARTMENT OF HOME FINANCE, FEDERAL MINISTRY OF FINANCE
CENTRAL BUSINESS DISTRICT AREA, AHMADU BELLO WAY, ABUJA.

REQUEST FOR EXPRESSIONS OF INTEREST
(CONSULTING SERVICES – FIRMS SELECTION)


COUNTRY: NIGERIA
PROJECT: STATE ACTION ON BUSINESS ENABLING REFORMS (SABER) PROGRAMME – INVESTMENT PROJECT FINANCING (IPF) COMPONENT
LOAN NO.: IDA 72090
ASSIGNMENT TITLE: ENGAGEMENT OF SOCIAL AUDIT FIRM
REFERENCE NO.: NG-SABER NPCO-538420-CS-CQS

The State Action on Business Enabling Reforms (SABER) Operation focuses on improving the business enabling environment in Nigerian states and the Federal Capital Territory (FCT). Leveraging the States Fiscal Transparency, Accountability and Sustainability (SFTAS) Program, which has created a mutual accountability platform between the federal government and the states, the SABER program will further consolidate and deepen gains from business enabling reforms implemented across the country by the Presidential Enabling Business Environment Council (PEBEC)-National Economic Council (NEC) subnational interventions through incentives, in the form of results-based financing to the states, and the delivery of wholesale technical assistance–available to all states–to support gaps in reform implementation.
 
The SABER Operation is receiving financial support in the form of a credit from the World Bank to support its implementation. The Home Finance Department (HFD) in the Federal Ministry of Finance, Budget and National Planning (FMFBNP) houses the Program Coordination Unit (PCU).  The PCU intends to procure the consulting services of an Social Audit Firm.

The consulting services (“the Services”) include to assess and verify the achievement of certain results (described in the ToR) laid out in the Disbursement Linked Indicator (DLI) matrix (and Verification Protocol) in a manner and substance that conforms with guidelines, procedures and proper documentation. Results will be verified through desk reviews, key informant interviews. and physical inspection through field visits to confirm authenticity. This assignment relates only to a section of DLI 1.2 in the Verification Protocol (VP) and DLI Matrix, which requires, among other things, that States demonstrate that the Framework for Responsible and Inclusive Land Intensive Investment, FRILIA, is under satisfactory implementation as evidenced by its application to at least 1 pilot investment materialized that has been approved under the FRILIA process and confirmed in a social audit. The assignment is expected to start in Q2 2026. During the assignment, the selected firm is expected to conduct the social audit for all States participating in the DLI (Disbursement Linked Indicator) and in line with the timelines set out in an audit plan approved by the Program Coordinating Unit.
(While the program is open to all States, not all states are expected to participate fully in this Indicator. The selected firm will only carry out the social audits for states that have instituted at least one pilot investment and confirmed by the PCU – This is currently estimated at twenty States.) 


The detailed Terms of Reference (TOR) for the assignment can be found at the following website: https://www.pebec.gov.ng/saber/materials. 


The PCU now invites eligible consulting firms (“Consultants”) to indicate their interest in providing the Services. Interested Consultants should provide information demonstrating that they have the required qualifications and relevant experience to perform the Services. The shortlisting criteria are:
 
1.The Social Audit Firm will be a top tier audit/consulting firm, or consortium of firms, with a minimum of 10 years operational existence as an organization. 
2.Minimum of two similar assignments in the last 7 years.
3.Demonstrated experience in verification/audit exercises, with both desk-and field verification methods.
4.Demonstrated expertise in social audits, land tenure, land administration, sustainable and inclusive land-intensive investment in agriculture in Nigeria. 
5.Experience working with State government, private sector investors and Community-level stakeholders. Familiarity at both the federal and state level is desirable. 
6.Comprehensive knowledge of the Framework for Responsible and Inclusive Land Intensive Investment in Agriculture (FRILIA), or its equivalent.
7.Comprehensive knowledge and understanding of controls within an IT environment, including experience and competence in managing, storing, filing data electronically.
8.Persons carrying out the tasks should be fluent in English. and have fluency in other native Nigerian languages.
To perform the required social audit tasks, the Firm shall have representatives (offices), at the minimum, in the two regions (North and South) of the country. In the case of a consortium, which shall not be more than three (3) firms, each firm’s profile must be included in the submitted Proposal. 

The Qualifications and Experience of Key Experts shall not be included in the shortlisting criteria. Key Experts will not be evaluated at the shortlisting stage.

The attention of interested Consultants is drawn to Section III, paragraphs, 3.14, 3.16, and 3.17 of the World Bank’s “Procurement Regulations for IPF Borrowers” March, 2025, setting forth the World Bank’s policy on conflict of interest. 

Consultants may associate with other firms to enhance their qualifications, but should indicate clearly whether the association is in the form of a joint venture and/or a sub-consultancy. In the case of a joint venture, all the partners in the joint venture shall be jointly and severally liable for the entire contract, if selected.

The Social Audit Firm will be selected in accordance with the Consultant Qualification Selection (CQS) procedures set out in the World Bank ‘Procurement Regulations for IPF Borrowers’ (Procurement Regulations) dated March 2025, available at the World Bank website: available at the World Bank website: https://thedocs.worldbank.org/en/doc/178331533065871195-0290022020/original/ProcurementRegulations.pdf.

Further information can be obtained at the address below during office 0900 to 1700 hours.
 
Expressions of interest must be delivered in a written form to the address below (in person, or by mail or by e-mail) by 12.00noon Tuesday 5th May 2026.
 
Federal Ministry of Finance (Nigeria)
Attn: Dr. Ali Mohammed
National Program Coordinator, SABER
Director - Home Finance Department,
Block B, Room 410B, Fourth Floor,
Federal Ministry of Finance Building
Central Business District, Abuja, FCT, Nigeria
+2347033337112
+2348065488888
saberprocurement@gmail.com 
 
 
 
Signed
Dr. Ali Mohammed
National Program Coordinator, SABER
Director - Home Finance Department,
Federal Ministry of Finance
Central Business District, Abuja, FCT, Nigeria`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 mt-30 space-y-8">
      <div className="space-y-3">
        <Link
          href="/saber"
          className="inline-flex items-center text-sky-700 font-medium hover:underline text-sm"
        >
          ← Back to Saber
        </Link>
        <div className="rounded-lg border bg-white p-6 text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/images/federal-coat-of-arms.png"
              alt="Federal Republic of Nigeria Coat of Arms"
              width={110}
              height={92}
              className="h-auto w-auto"
              priority
            />
          </div>
          <p className="text-xs font-semibold tracking-widest text-gray-700">FEDERAL REPUBLIC OF NIGERIA</p>
          <p className="text-xl md:text-2xl font-extrabold text-gray-900">FEDERAL MINISTRY OF FINANCE</p>
          <p className="text-xs uppercase text-gray-600">Department of Home Finance, Federal Ministry of Finance</p>
          <p className="text-xs text-gray-600">Central Business District, Area 1, Abuja, FCT, Nigeria</p>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <div className="whitespace-pre-wrap text-[15px] leading-7 text-gray-900 font-serif">
          {noticeText}
        </div>
      </div>
    </div>
  );
}
