import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  AgreementClient, 
  AttachmentClient, 
  LookupClient,
  FullAgreementDto,
  FullAgreementDtoResponse,
  Int32Response,
  GetAllAgreementDtoListPagedResponseResponse,
  GetAttachmentMetaDataResponse,
  GetAttachmentMetaDataListResponse,
  BooleanResponse,
  StringLookupDtoListDictionaryResponse
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class AgreementWizardService {

  constructor(
    private agreementClient: AgreementClient,
    private attachmentClient: AttachmentClient,
    private lookupClient: LookupClient
  ) { }

  // Agreement methods
  createAgreement(agreementData: FullAgreementDto): Observable<Int32Response> {
    return this.agreementClient.createAgreement(agreementData);
  }

  getAllAgreements(pageNumber?: number, pageSize?: number): Observable<GetAllAgreementDtoListPagedResponseResponse> {
    return this.agreementClient.getAllAgreements(pageNumber, pageSize);
  }

  getAgreementById(id: number, step?: number): Observable<FullAgreementDtoResponse> {
    return this.agreementClient.getAgreementById(id, step);
  }

  // Attachment methods
  getAttachmentById(id: number): Observable<GetAttachmentMetaDataResponse> {
    return this.attachmentClient.getAttachmentById(id);
  }

  deleteAttachment(id: number): Observable<BooleanResponse> {
    return this.attachmentClient.deleteAttachment(id);
  }

  getAttachmentsByAgreementId(agreementId: number): Observable<GetAttachmentMetaDataListResponse> {
    return this.attachmentClient.getAttachmentsByAgreementId(agreementId);
  }

  downloadAttachment(id: number): Observable<void> {
    return this.attachmentClient.downloadAttachment(id);
  }

  // Lookup methods
  getAllLookups(lookupTypes?: string[]): Observable<StringLookupDtoListDictionaryResponse> {
    return this.lookupClient.getAllLookups(lookupTypes);
  }
}
