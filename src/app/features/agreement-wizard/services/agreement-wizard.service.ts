import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  StringLookupDtoListDictionaryResponse,
  LookupDto
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

  // Helper methods to get specific lookups
  getCountries(): Observable<LookupDto[]> {
    return this.getAllLookups(['country']).pipe(
      map(response => {
        if (response.succeeded && response.data && response.data['country']) {
          return response.data['country'];
        }
        return [];
      })
    );
  }

  getCities(): Observable<LookupDto[]> {
    return this.getAllLookups(['city']).pipe(
      map(response => {
        if (response.succeeded && response.data && response.data['city']) {
          return response.data['city'];
        }
        return [];
      })
    );
  }

  getAgreementTypes(): Observable<LookupDto[]> {
    return this.getAllLookups(['agreementtype']).pipe(
      map(response => {
        if (response.succeeded && response.data && response.data['agreementtype']) {
          return response.data['agreementtype'];
        }
        return [];
      })
    );
  }

  // Get all required lookups for step 1 at once
  getStep1Lookups(): Observable<{ countries: LookupDto[], cities: LookupDto[], agreementTypes: LookupDto[] }> {
    return this.getAllLookups(['country', 'city', 'agreementtype']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            countries: response.data['country'] || [],
            cities: response.data['city'] || [],
            agreementTypes: response.data['agreementtype'] || []
          };
        }
        return { countries: [], cities: [], agreementTypes: [] };
      })
    );
  }

  // Get lookups for Step 2
  getStep2Lookups(): Observable<{
    contractTypes: LookupDto[],
    contractModels: LookupDto[],
    paymentMethods: LookupDto[],
    services: LookupDto[]
  }> {
    return this.getAllLookups(['contracttype', 'contractmodel', 'paymentmethod', 'service']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            contractTypes: response.data['contracttype'] || [],
            contractModels: response.data['contractmodel'] || [],
            paymentMethods: response.data['paymentmethod'] || [],
            services: response.data['service'] || []
          };
        }
        return { contractTypes: [], contractModels: [], paymentMethods: [], services: [] };
      })
    );
  }

  // Get lookups for Step 3
  getStep3Lookups(): Observable<{ units: LookupDto[], annexes: LookupDto[] }> {
    return this.getAllLookups(['unit', 'annex']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            units: response.data['unit'] || [],
            annexes: response.data['annex'] || []
          };
        }
        return { units: [], annexes: [] };
      })
    );
  }

  // Get lookups for Step 4
  getStep4Lookups(): Observable<{
    mainContractTypes: LookupDto[],
    constructors: LookupDto[],
    units: LookupDto[],
    dutyTypes: LookupDto[],
    dutyResponsibilities: LookupDto[]
  }> {
    return this.getAllLookups(['maincontracttype', 'constructor', 'unit', 'dutytype', 'dutyresponsibility']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            mainContractTypes: response.data['maincontracttype'] || [],
            constructors: response.data['constructor'] || [],
            units: response.data['unit'] || [],
            dutyTypes: response.data['dutytype'] || [],
            dutyResponsibilities: response.data['dutyresponsibility'] || []
          };
        }
        return { mainContractTypes: [], constructors: [], units: [], dutyTypes: [], dutyResponsibilities: [] };
      })
    );
  }

  // Get lookups for Step 5
  getStep5Lookups(): Observable<{ materials: LookupDto[], suppliers: LookupDto[] }> {
    return this.getAllLookups(['material', 'supplier']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            materials: response.data['material'] || [],
            suppliers: response.data['supplier'] || []
          };
        }
        return { materials: [], suppliers: [] };
      })
    );
  }

  // Get lookups for Step 6
  getStep6Lookups(): Observable<{ materials: LookupDto[], units: LookupDto[], milestones: LookupDto[] }> {
    return this.getAllLookups(['material', 'unit', 'milestones']).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return {
            materials: response.data['material'] || [],
            units: response.data['unit'] || [],
            milestones: response.data['milestones'] || []
          };
        }
        return { materials: [], units: [], milestones: [] };
      })
    );
  }
}
