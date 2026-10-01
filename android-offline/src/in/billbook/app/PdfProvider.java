package in.billbook.app;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Read-only, URI-granted access to generated PDF attachments only. */
public class PdfProvider extends ContentProvider {
  @Override public boolean onCreate(){return true;}
  private File resolve(Uri uri) throws FileNotFoundException {
    if(!"in.billbook.app.pdf".equals(uri.getAuthority())||uri.getPathSegments().size()!=2||!"pdf".equals(uri.getPathSegments().get(0)))throw new FileNotFoundException("Invalid PDF URI");
    String name=uri.getLastPathSegment();
    if(name==null||!name.matches("[A-Za-z0-9_-]+\\.pdf"))throw new FileNotFoundException("Invalid filename");
    File file=new File(new File(getContext().getCacheDir(),"shared-bills"),name);
    if(!file.isFile())throw new FileNotFoundException("PDF is unavailable");return file;
  }
  @Override public String getType(Uri uri){return "application/pdf";}
  @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{
    if(!"r".equals(mode))throw new FileNotFoundException("Read-only attachment");return ParcelFileDescriptor.open(resolve(uri),ParcelFileDescriptor.MODE_READ_ONLY);
  }
  @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order){
    try{File file=resolve(uri);String[] columns=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;
      MatrixCursor cursor=new MatrixCursor(columns,1);Object[] values=new Object[columns.length];for(int n=0;n<columns.length;n++){if(OpenableColumns.DISPLAY_NAME.equals(columns[n]))values[n]=file.getName();else if(OpenableColumns.SIZE.equals(columns[n]))values[n]=file.length();}cursor.addRow(values);return cursor;
    }catch(FileNotFoundException e){return null;}
  }
  @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException("Read-only");}
  @Override public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException("Read-only");}
  @Override public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException("Read-only");}
}
