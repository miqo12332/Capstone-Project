import React from "react"
import { CCard, CCardBody, CCardHeader, CRow, CCol } from "@coreui/react"

const Contact = () => {
  return (
    <CRow className="justify-content-center mt-5">
      <CCol xs={12} md={8}>
        <CCard>
          <CCardHeader><h4>📩 Contact Us</h4></CCardHeader>
          <CCardBody>
            <p className="mb-3">
              Reach out to us anytime using the contact details below.
            </p>
            <p className="mb-2"><strong>Email:</strong> davtyan.mikayel123@gmail.com</p>
            <p><strong>Contact Number:</strong> +3749133224</p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Contact
