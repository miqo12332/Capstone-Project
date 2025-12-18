import React from "react"
import { CCard, CCardBody, CCardHeader, CRow, CCol } from "@coreui/react"

const Contact = () => {
  return (
    <CRow className="justify-content-center mt-5">
      <CCol xs={12} md={8}>
        <CCard>
          <CCardHeader><h4>📩 Contact Us</h4></CCardHeader>
          <CCardBody>
            <div className="mb-3">
              <strong>Email:</strong>{" "}
              <a href="mailto:davtyan.mikayel123@gmail.com">davtyan.mikayel123@gmail.com</a>
            </div>
            <div>
              <strong>Phone:</strong>{" "}
              <a href="tel:+3749131214">+3749131214</a>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Contact

